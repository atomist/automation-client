import * as _ from "lodash";

import * as stringify from "json-stringify-safe";
import { ApolloGraphClient } from "../graph/ApolloGraphClient";
import {
    EventFired,
    HandleCommand,
    HandleEvent,
    HandlerContext,
    HandlerResult,
} from "../index";
import { Ingester } from "../ingesters";
import { NodeConfigSecretResolver } from "../internal/env/NodeConfigSecretResolver";
import {
    Arg,
    CommandInvocation,
    Invocation, Secret,
} from "../internal/invoker/Payload";
import { Automations, isCommandHandlerMetadata } from "../internal/metadata/metadata";
import { metadataFromInstance } from "../internal/metadata/metadataReading";
import { populateParameters } from "../internal/parameterPopulation";
import { logger } from "../internal/util/logger";
import { toStringArray } from "../internal/util/string";
import {
    CommandHandlerMetadata,
    EventHandlerMetadata, SecretsMetadata,
} from "../metadata/automationMetadata";
import { isSmartParameters, isValidationError, ValidationResult } from "../SmartParameters";
import { SecretResolver } from "../spi/env/SecretResolver";
import { GraphClient } from "../spi/graph/GraphClient";
import {
    Maker,
    toFactory,
} from "../util/constructionUtils";
import { AbstractAutomationServer } from "./AbstractAutomationServer";
import { AutomationServerOptions } from "./options";

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

    private graphClient: GraphClient;

    private commandHandlers: CommandHandlerRegistration[] = [];

    private eventHandlers: EventHandlerRegistration[] = [];

    private ingesters: Ingester[] = [];

    constructor(public opts: AutomationServerOptions,
                private fallbackSecretResolver: SecretResolver = new NodeConfigSecretResolver()) {
        super();
        if (opts.endpoints && opts.endpoints.graphql) {
            if (opts.teamIds) {
                let teamId: string;
                if (opts.teamIds.length === 1) {
                    teamId = opts.teamIds[0];
                } else if (opts.teamIds.length > 1) {
                    teamId = opts.teamIds[0];
                }
                if (teamId) {
                    if (opts.token) {
                        this.graphClient = new ApolloGraphClient(`${opts.endpoints.graphql}/${teamId}`,
                            { Authorization: `token ${opts.token}` });
                    } else {
                        logger.warn("Cannot create graph client due to missing token");
                    }
                } else {
                    logger.warn("Cannot create graph client because no team IDs provided");
                }
            }
        } else {
            logger.warn("Cannot create graph client due to missing GraphQL URL");
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
                metadata: md,
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
            metadata: md,
            invoke: (i, ctx) => {
                const freshParams = !!hc.freshParametersInstance ? hc.freshParametersInstance() : hc;
                return this.invokeCommandHandlerWithFreshParametersInstance(hc, md, freshParams, i, ctx);
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
                metadata: md,
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
        logger.info("Invoking command handler '%s'", metadata.name);
        return handler.invoke(invocation, ctx);
    }

    protected invokeEventHandler(e: EventFired<any>, metadata: EventHandlerMetadata,
                                 ctx: HandlerContext): Promise<HandlerResult> {
        const handler = this.eventHandlers.find(a => a.metadata.name === metadata.name);
        logger.info("Invoking event handler '%s'", metadata.name);
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
                    return Promise.reject(
                        `Error: Handler [${md.name}] returned null or undefined: Probably a user coding error`);
                }
                return handlerResult
                    .catch(err => {
                        logger.error("Rejecting promise on " + err);
                        return Promise.reject(err);
                    });
            });
    }

    private invokeFreshEventHandlerInstance(h: HandleEvent<any>,
                                            metadata: EventHandlerMetadata,
                                            e: EventFired<any>,
                                            ctx: HandlerContext): Promise<HandlerResult> {
        this.populateSecrets(h, metadata, e.secrets);
        return h.handle(e, this.enrichContext(ctx), h)
            .catch(err => {
                // these do not fire when the handler fails.
                // perhaps only in the case of unexpected errors?
                logger.error("Rejecting promise on " + err);
                return Promise.reject(err);
            });
    }

    private invokeFreshIngestorInstance(h: HandleEvent<any>,
                                        e: EventFired<any>,
                                        ctx: HandlerContext): Promise<HandlerResult> {
        return h.handle(e, this.enrichContext(ctx), h)
            .catch(err => {
                logger.error("Rejecting promise on " + err);
                return Promise.reject(err);
            });
    }

    private enrichContext(ctx: HandlerContext): HandlerContext {
        ctx.graphClient = ctx.graphClient || this.graphClient;
        return ctx;
    }

    private populateMappedParameters(h: {}, metadata: CommandHandlerMetadata, invocation: Invocation) {
        // Resolve from the invocation, otherwise from our fallback
        class InvocationSecretResolver implements SecretResolver {
            constructor(private mp: Arg[]) {
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
            this.fallbackSecretResolver;
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
            constructor(private sec: Secret[]) {
            }

            public resolve(key: string): string {
                const value = this.sec.find(a => a.uri === key);
                if (value) {
                    return String(value.value);
                }
                throw new Error(`Cannot resolve secret '${key}'`);
            }
        }

        const secretResolver = invocationSecrets ? new InvocationSecretResolver(invocationSecrets) :
            this.fallbackSecretResolver;
        // logger.debug("Applying secrets");
        const secrets = metadata.secrets || [];
        secrets.forEach(s => {
            _.update(h, s.name, () => secretResolver.resolve(s.uri));
        });
    }

    get automations(): Automations {
        return {
            name: this.opts.name,
            version: this.opts.version,
            policy: this.opts.policy,
            team_ids: toStringArray(this.opts.teamIds),
            groups: toStringArray((this.opts as any).groups),
            keywords: this.opts.keywords,
            commands: this.commandHandlers.map(e => e.metadata),
            events: this.eventHandlers.map(e => e.metadata),
            ingesters: this.ingesters,
        };
    }

}
