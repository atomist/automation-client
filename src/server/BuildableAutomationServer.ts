import * as stringify from "json-stringify-safe";
import { ApolloGraphClient } from "../graph/ApolloGraphClient";
import {
    EventFired,
    HandleCommand,
    HandleEvent,
    HandlerContext,
    HandlerResult,
} from "../index";
import { NodeConfigSecretResolver } from "../internal/env/NodeConfigSecretResolver";
import {
    Arg,
    CommandInvocation,
    Invocation,
} from "../internal/invoker/Payload";
import { Automations, isCommandHandlerMetadata } from "../internal/metadata/metadata";
import { metadataFromInstance } from "../internal/metadata/metadataReading";
import { populateParameters } from "../internal/parameterPopulation";
import { logger } from "../internal/util/logger";
import { toStringArray } from "../internal/util/string";
import {
    CommandHandlerMetadata,
    EventHandlerMetadata,
} from "../metadata/automationMetadata";
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

    private ingesters: any[] = [];

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
                    logger.warn(`Provided ${opts.teamIds.length} team IDs, using the first: ${teamId}`);
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
        const md = metadataFromInstance(instanceToInspect) as CommandHandlerMetadata;
        if (!md) {
            throw new Error(`Cannot get metadata from handler '${stringify(instanceToInspect)}'`);
        }
        this.commandHandlers.push({
            metadata: md,
            invoke: (i, ctx) => {
                const newHandler = factory();
                return this.invokeCommandHandlerWithFreshParametersInstance(newHandler, md, newHandler, i, ctx);
            },
        });
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
        const md = metadataFromInstance(instanceToInspect) as EventHandlerMetadata;
        if (!md) {
            throw new Error(`Cannot get metadata from event handler '${stringify(instanceToInspect)}'`);
        }
        this.eventHandlers.push({
            metadata: md,
            invoke: (e, ctx) => this.invokeFreshEventHandlerInstance(factory(), e, ctx),
        });
        return this;
    }

    public registerIngester(ingester: any): this {
        this.ingesters.push(ingester);
        return this;
    }

    protected invokeCommandHandler(invocation: CommandInvocation, h: CommandHandlerMetadata,
                                   ctx: HandlerContext): Promise<HandlerResult> {
        const handler = this.commandHandlers.find(a => a.metadata.name === invocation.name);
        logger.info("Invoking command handler '%s'", h.name);
        return handler.invoke(invocation, ctx);
    }

    protected invokeEventHandler(e: EventFired<any>, h: EventHandlerMetadata,
                                 ctx: HandlerContext): Promise<HandlerResult> {
        const handler = this.eventHandlers.find(a => a.metadata.name === h.name);
        logger.info("Invoking event handler '%s'", h.name);
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
        this.populateMappedParameters(h, invocation);
        this.populateSecrets(h, invocation.secrets);
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
    }

    private invokeFreshEventHandlerInstance(h: HandleEvent<any>,
                                            e: EventFired<any>,
                                            ctx: HandlerContext): Promise<HandlerResult> {
        this.populateSecrets(h, e.secrets);
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
        return {
            teamId: ctx.teamId,
            correlationId: ctx.correlationId,
            invocationId: ctx.invocationId,
            messageClient: ctx.messageClient,
            graphClient: ctx.graphClient ? ctx.graphClient : this.graphClient,
        };
    }

    private populateMappedParameters(h: {}, invocation: Invocation) {
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
        const secretResolver = invocation.mappedParameters ?
            new InvocationSecretResolver(invocation.mappedParameters) :
            this.fallbackSecretResolver;
        // logger.debug("Applying mapped parameters");
        const target = h as any;
        const mappedParameters: any[] =
            target.__mappedParameters ? target.__mappedParameters : [];
        mappedParameters.forEach(mp => {
            h[mp.localKey] = secretResolver.resolve(mp.localKey);
        });
    }

    private populateSecrets(h: {}, invocationSecrets: Arg[] | undefined) {
        // Resolve from the invocation, otherwise from our fallback
        class InvocationSecretResolver implements SecretResolver {
            constructor(private sec: Arg[]) {
            }

            public resolve(key: string): string {
                const value = this.sec.find(a => a.name === key);
                if (value) {
                    return String(value.value);
                }
                throw new Error(`Cannot resolve secret '${key}'`);
            }
        }

        const secretResolver = invocationSecrets ? new InvocationSecretResolver(invocationSecrets) :
            this.fallbackSecretResolver;
        // logger.debug("Applying secrets");
        const target = h as any;
        // why do we not get these from the metadata? ... because we don't pass it in, i guess
        const secrets: any[] =
            target.__secrets ? target.__secrets : [];
        secrets.forEach(s => {
            h[s.name] = secretResolver.resolve(s.path);
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
