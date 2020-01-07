import * as stringify from "json-stringify-safe";
import * as _ from "lodash";
import * as semver from "semver";
import { Configuration } from "../configuration";
import { HandleCommand } from "../HandleCommand";
import {
    EventFired,
    HandleEvent,
} from "../HandleEvent";
import { HandlerContext } from "../HandlerContext";
import {
    HandlerResult,
    SuccessPromise,
} from "../HandlerResult";
import { NodeConfigSecretResolver } from "../internal/env/NodeConfigSecretResolver";
import {
    Arg,
    CommandInvocation,
    Invocation,
    Secret,
} from "../internal/invoker/Payload";
import {
    Automations,
    isCommandHandlerMetadata,
} from "../internal/metadata/metadata";
import { metadataFromInstance } from "../internal/metadata/metadataReading";
import {
    populateParameters,
    populateValues,
} from "../internal/parameterPopulation";
import { toStringArray } from "../internal/util/string";
import {
    CommandHandlerMetadata,
    EventHandlerMetadata,
    SecretsMetadata,
} from "../metadata/automationMetadata";
import {
    isSmartParameters,
    isValidationError,
    ValidationResult,
} from "../SmartParameters";
import {
    AutomationMetadataProcessor,
    PassThroughMetadataProcessor,
} from "../spi/env/MetadataProcessor";
import { SecretResolver } from "../spi/env/SecretResolver";
import {
    Maker,
    toFactory,
} from "../util/constructionUtils";
import { logger } from "../util/logger";
import { AbstractAutomationServer } from "./AbstractAutomationServer";

interface CommandHandlerRegistration {

    metadata: CommandHandlerMetadata;

    invoke(i: CommandInvocation, ctx: HandlerContext): Promise<HandlerResult>;
}

interface EventHandlerRegistration {

    metadata: EventHandlerMetadata;

    invoke(e: EventFired<any>, ctx: HandlerContext): Promise<HandlerResult>;
}

/**
 * Simple automation server that offers building style
 * configuration
 */
export class BuildableAutomationServer extends AbstractAutomationServer {

    private readonly commandHandlers: CommandHandlerRegistration[] = [];

    private readonly eventHandlers: EventHandlerRegistration[] = [];

    private readonly ingesters: string[] = [];

    private readonly secretResolver: SecretResolver = new NodeConfigSecretResolver();

    private readonly metadataProcessor: AutomationMetadataProcessor = new PassThroughMetadataProcessor();

    constructor(public opts: Configuration) {
        super();

        if (opts.secretResolver) {
            this.secretResolver = opts.secretResolver;
        }

        if (opts.metadataProcessor) {
            this.metadataProcessor = opts.metadataProcessor;
        }
    }

    public registerCommandHandler(chm: Maker<HandleCommand>): this {
        const factory = toFactory(chm);
        const instanceToInspect = factory();
        if (instanceToInspect) {
            const md = metadataFromInstance(instanceToInspect) as CommandHandlerMetadata;
            if (!md) {
                throw new Error(`Cannot get metadata from handler '${stringify(instanceToInspect)}'`);
            }
            this.commandHandlers.push({
                metadata: this.metadataProcessor.process(md, this.opts),
                invoke: (i, ctx) => {
                    const newHandler = factory();
                    const params = !!newHandler.freshParametersInstance ? newHandler.freshParametersInstance() : newHandler;
                    return this.invokeCommandHandlerWithFreshParametersInstance(newHandler, md, params, i, ctx);
                },
            });
        }
        return this;
    }

    public fromCommandHandler<P>(hc: HandleCommand<P>): this {
        const md = isCommandHandlerMetadata(hc) ? hc : metadataFromInstance(hc);
        this.commandHandlers.push({
            metadata: this.metadataProcessor.process<CommandHandlerMetadata>(md, this.opts),
            invoke: (i, ctx) => {
                const freshParams = !!hc.freshParametersInstance ? hc.freshParametersInstance() : hc as any as P;
                return this.invokeCommandHandlerWithFreshParametersInstance<P>(hc, md, freshParams, i, ctx);
            },
        });
        return this;
    }

    public registerEventHandler(maker: Maker<HandleEvent<any>>): this {
        const factory = toFactory(maker);
        const instanceToInspect = factory();
        if (instanceToInspect) {
            const md = metadataFromInstance(instanceToInspect) as EventHandlerMetadata;
            if (!md) {
                throw new Error(`Cannot get metadata from event handler '${stringify(instanceToInspect)}'`);
            }
            this.eventHandlers.push({
                metadata: this.metadataProcessor.process<EventHandlerMetadata>(md, this.opts),
                invoke: (e, ctx) => this.invokeFreshEventHandlerInstance(factory(), md, e, ctx),
            });
        }
        return this;
    }

    public registerIngester(ingester: any): this {
        this.ingesters.push(ingester);
        return this;
    }

    protected invokeCommandHandler(invocation: CommandInvocation, metadata: CommandHandlerMetadata,
                                   ctx: HandlerContext): Promise<HandlerResult> {
        const handler = this.commandHandlers.find(a => a.metadata.name === invocation.name);
        logger.debug("Invoking command handler '%s'", metadata.name);
        return handler.invoke(invocation, ctx);
    }

    protected invokeEventHandler(e: EventFired<any>, metadata: EventHandlerMetadata,
                                 ctx: HandlerContext): Promise<HandlerResult> {
        const handler = this.eventHandlers.find(a => a.metadata.name === metadata.name);
        logger.debug("Invoking event handler '%s'", metadata.name);
        return handler.invoke(e, ctx);
    }

    /**
     * Populate handler parameters
     */
    private invokeCommandHandlerWithFreshParametersInstance<P>(h: HandleCommand<P>,
                                                               md: CommandHandlerMetadata,
                                                               params: P,
                                                               invocation: CommandInvocation,
                                                               ctx: HandlerContext): Promise<HandlerResult> {
        populateParameters(params, md, invocation.args);
        populateValues(params, md, this.opts);
        this.populateMappedParameters(params, md, invocation);
        this.populateSecrets(params, md, invocation.secrets);

        const bindAndValidate: Promise<ValidationResult> =
            isSmartParameters(params) ?
                Promise.resolve(params.bindAndValidate()) :
                Promise.resolve();

        return bindAndValidate
            .then(vr => {
                if (isValidationError(vr)) {
                    return Promise.reject(`Validation failure invoking command handler '${md.name}': [${vr.message}]`);
                }

                const handlerResult = h.handle(this.enrichContext(ctx), params);
                if (!handlerResult) {
                    return SuccessPromise;
                }
                return (handlerResult as Promise<HandlerResult>)
                    .then(result => {
                        if (result) {
                            return result;
                        } else {
                            return SuccessPromise;
                        }
                    });
            });
    }

    private invokeFreshEventHandlerInstance(h: HandleEvent<any>,
                                            metadata: EventHandlerMetadata,
                                            e: EventFired<any>,
                                            ctx: HandlerContext): Promise<HandlerResult> {
        this.populateSecrets(h, metadata, e.secrets);
        populateValues(h, metadata, this.opts);
        const handlerResult = h.handle(e, this.enrichContext(ctx), h);
        if (!handlerResult) {
            return SuccessPromise;
        }

        return (handlerResult)
            .then(result => {
                if (result) {
                    return result;
                } else {
                    return SuccessPromise;
                }
            });
    }

    private enrichContext(ctx: HandlerContext): HandlerContext {
        ctx.graphClient = ctx.graphClient || this.opts.graphql.client.factory.create(ctx.workspaceId, this.opts);
        return ctx;
    }

    private populateMappedParameters(h: {}, metadata: CommandHandlerMetadata, invocation: Invocation) {
        // Resolve from the invocation, otherwise from our fallback
        class InvocationSecretResolver implements SecretResolver {
            constructor(private readonly mp: Arg[]) {
            }

            public resolve(key: string): string {
                const value = this.mp.find(a => a.name === key);
                if (value) {
                    return String(value.value);
                }
                throw new Error(`Cannot resolve mapped parameter '${key}'`);
            }
        }

        // if the bot sends any of them, then only use those?
        // it does not fallback for each parameter; all or nothing.
        // this is probably by design ... is there a test/dev circumstance where
        // mappedParameters is not populated?

        const mrResolver = invocation.mappedParameters ?
            new InvocationSecretResolver(invocation.mappedParameters) :
            this.secretResolver;
        // logger.debug("Applying mapped parameters");
        const mappedParameters = metadata.mapped_parameters || [];
        const invMps = invocation.mappedParameters || [];
        mappedParameters.forEach(mp => {
            if (invMps.some(im => im.name === mp.name) || mp.required) {
                _.update(h, mp.name, () => mrResolver.resolve(mp.name));
            }
        });
    }

    private populateSecrets(h: {}, metadata: SecretsMetadata, invocationSecrets: Secret[] | undefined) {
        // Resolve from the invocation, otherwise from our fallback
        class InvocationSecretResolver implements SecretResolver {
            constructor(private readonly sec: Secret[]) {
            }

            public resolve(key: string): string {
                const value = this.sec.find(a => a.uri === key);
                if (value) {
                    if (!!value.value) {
                        return String(value.value);
                    } else {
                        return undefined;
                    }
                }
                return undefined;
                // throw new Error(`Cannot resolve secret '${key}'`);
            }
        }

        const secretResolver = invocationSecrets ? new InvocationSecretResolver(invocationSecrets) :
            this.secretResolver;
        // logger.debug("Applying secrets");
        const secrets = metadata.secrets || [];
        secrets.forEach(s => {
            _.update(h, s.name, () => secretResolver.resolve(s.uri));
        });
    }

    get automations(): Automations {
        const version = !!this.opts.version && this.opts.policy === "durable" ?
            `${semver.major(this.opts.version)}.0.0` : this.opts.version;
        return {
            name: this.opts.name,
            version: version || "0.0.0",
            policy: this.opts.policy,
            team_ids: this.opts.workspaceIds,
            groups: toStringArray((this.opts as any).groups),
            keywords: this.opts.keywords,
            commands: this.commandHandlers.map(e => e.metadata),
            events: this.eventHandlers.map(e => e.metadata),
            ingesters: this.ingesters,
        };
    }

}
