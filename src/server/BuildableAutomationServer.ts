import { Arg, CommandInvocation, Invocation } from "../internal/invoker/Payload";
import { CommandHandlerMetadata, EventHandlerMetadata, IngestorMetadata, Rugs } from "../internal/metadata/metadata";
import { AbstractAutomationServer } from "./AbstractAutomationServer";

import { HandleCommand } from "../HandleCommand";
import { HandlerContext } from "../HandlerContext";
import { NodeConfigSecretResolver } from "../internal/env/NodeConfigSecretResolver";
import { metadataFromInstance } from "../internal/metadata/metadataReading";
import { SecretResolver } from "../spi/env/SecretResolver";

import { ApolloGraphClient } from "../graph/ApolloGraphClient";
import { EventFired, HandleEvent } from "../HandleEvent";
import { HandlerResult } from "../HandlerResult";
import { GraphClient } from "../spi/graph/GraphClient";

import { logger } from "../internal/util/logger";
import { populateParameters } from "../operations/support/parameterPopulation";
import { AutomationServerOptions } from "./options";

interface CommandHandlerRegistration {

    metadata: CommandHandlerMetadata;

    invoke(i: CommandInvocation, ctx: HandlerContext): Promise<HandlerResult>;
}

interface EventHandlerRegistration {

    metadata: EventHandlerMetadata;

    invoke(e: EventFired<any>, ctx: HandlerContext): Promise<HandlerResult>;
}

interface IngestorRegistration {

    metadata: IngestorMetadata;

    invoke(e: EventFired<any>, ctx: HandlerContext): Promise<HandlerResult>;
}

/**
 * Simple automation server that works from a builder
 */
export class BuildableAutomationServer extends AbstractAutomationServer {

    private graphClient: GraphClient;

    private commandHandlers: CommandHandlerRegistration[] = [];

    private eventHandlers: EventHandlerRegistration[] = [];

    private ingestors: IngestorRegistration[] = [];

    constructor(public opts: AutomationServerOptions,
                private fallbackSecretResolver: SecretResolver = new NodeConfigSecretResolver()) {
        super();
        // logger.debug("Starting BuildableAutomationServer with options:\n%s", JSON.stringify(opts, null, 2));
        if (opts.endpoints && opts.endpoints.graphql) {
            if (opts.token) {
                this.graphClient = new ApolloGraphClient(opts.endpoints.graphql,
                    { Authorization: `Basic ${opts.token}` });
            } else {
                logger.warn("Cannot create graph client due to missing token");
            }
        } else {
            logger.warn("Cannot create graph client due to missing GraphQL URL");
        }
    }

    public withCommandHandler(h: CommandHandlerMetadata, handler: (CommandInvocation) => Promise<HandlerResult>): this {
        this.commandHandlers.push({
            metadata: h,
            invoke: handler,
        });
        return this;
    }

    public fromCommandHandlerInstance(factory: () => HandleCommand): this {
        const instanceToInspect = factory();
        const md = metadataFromInstance(instanceToInspect) as CommandHandlerMetadata;
        if (!md) {
            throw new Error(`Cannot get metadata from handler '${JSON.stringify(instanceToInspect)}'`);
        }
        this.commandHandlers.push({
            metadata: md,
            invoke: (i, ctx) => this.invokeFreshCommandHandlerInstance(factory(), md, i, ctx),
        });
        return this;
    }

    public fromEventHandlerInstance(factory: () => HandleEvent<any>): this {
        const instanceToInspect = factory();
        const md = metadataFromInstance(instanceToInspect) as EventHandlerMetadata;
        if (!md) {
            throw new Error(`Cannot get metadata from event handler '${JSON.stringify(instanceToInspect)}'`);
        }
        this.eventHandlers.push({
            metadata: md,
            invoke: (e, ctx) => this.invokeFreshEventHandlerInstance(factory(), e, ctx),
        });
        return this;
    }

    public fromIngestorInstance(factory: () => HandleEvent<any>): this {
        const instanceToInspect = factory();
        const md = metadataFromInstance(instanceToInspect) as IngestorMetadata;
        if (!md) {
            throw new Error(`Cannot get metadata from ingestor '${JSON.stringify(instanceToInspect)}'`);
        }
        this.ingestors.push({
            metadata: md,
            invoke: (e, ctx) => this.invokeFreshIngestorInstance(factory(), e, ctx),
        });
        return this;
    }

    protected invokeCommandHandler(invocation: CommandInvocation, h: CommandHandlerMetadata,
                                   ctx: HandlerContext): Promise<HandlerResult> {
        const handler = this.commandHandlers.find(a => a.metadata.name === invocation.name);
        logger.debug("Invoking command handler '%s'", h.name);
        return handler.invoke(invocation, ctx);
    }

    protected invokeEventHandler(e: EventFired<any>, h: EventHandlerMetadata,
                                 ctx: HandlerContext): Promise<HandlerResult> {
        const handler = this.eventHandlers.find(a => a.metadata.name === h.name);
        logger.debug("Invoking event handler '%s'", h.name);
        return handler.invoke(e, ctx);
    }

    protected invokeIngestor(e: EventFired<any>, h: IngestorMetadata,
                             ctx: HandlerContext): Promise<HandlerResult> {
        const handler = this.ingestors.find(a => a.metadata.name === h.name);
        logger.debug("Invoking ingestor '%s'", h.name);
        return handler.invoke(e, ctx);
    }

    /**
     * Populate handler parameters
     * @param h
     * @param invocation
     */
    private invokeFreshCommandHandlerInstance(h: HandleCommand,
                                              md: CommandHandlerMetadata,
                                              invocation: CommandInvocation,
                                              ctx: HandlerContext): Promise<HandlerResult> {
        populateParameters(h, md, invocation.args);
        this.populateMappedParameters(h, invocation);
        this.populateSecrets(h, invocation.secrets);
        return h.handle(this.enrichContext(ctx))
            .catch(err => {
                logger.error("Rejecting promise on " + err);
                return Promise.reject(err);
            });
    }

    private invokeFreshEventHandlerInstance(h: HandleEvent<any>,
                                            e: EventFired<any>,
                                            ctx: HandlerContext): Promise<HandlerResult> {
        this.populateSecrets(h, e.secrets);
        return h.handle(e, this.enrichContext(ctx))
            .catch(err => {
                logger.error("Rejecting promise on " + err);
                return Promise.reject(err);
            });
    }

    private invokeFreshIngestorInstance(h: HandleEvent<any>,
                                        e: EventFired<any>,
                                        ctx: HandlerContext): Promise<HandlerResult> {
        return h.handle(e, this.enrichContext(ctx))
            .catch(err => {
                logger.error("Rejecting promise on " + err);
                return Promise.reject(err);
            });
    }

    private enrichContext(ctx: HandlerContext): HandlerContext {
        const context: HandlerContext = {
            teamId: ctx.teamId,
            correlationId: ctx.correlationId,
            invocationId: ctx.invocationId,
            messageClient: ctx.messageClient,
            graphClient: ctx.graphClient ? ctx.graphClient : this.graphClient,
        };
        return context;
    }

    private populateMappedParameters(h: {}, invocation: Invocation) {
        // Resolve from the invocation, otherwise from our fallback
        class InvocationSecretResolver implements SecretResolver {
            constructor(private mp: Arg[]) {
            }

            public resolve(key: string): string {
                const value = this.mp.find(a => a.name === key);
                if (value) {
                    return value.value;
                }
                throw new Error(`Cannot resolve mapped parameter '${key}'`);
            }
        }
        const secretResolver = invocation.mappedParameters ?
            new InvocationSecretResolver(invocation.mappedParameters) :
            this.fallbackSecretResolver;
        logger.debug("Applying mapped parameters");
        const target = h as any;
        const mappedParameters: any[] =
            target.__mappedParameters ? target.__mappedParameters : [];
        mappedParameters.forEach(mp => {
            h[mp.localKey] = secretResolver.resolve(mp.localKey);
        });
    }

    private populateSecrets(h: {}, invocationSecrets: Arg[]) {
        // Resolve from the invocation, otherwise from our fallback
        class InvocationSecretResolver implements SecretResolver {
            constructor(private sec: Arg[]) {
            }

            public resolve(key: string): string {
                const value = this.sec.find(a => a.name === key);
                if (value) {
                    return value.value;
                }
                throw new Error(`Cannot resolve secret '${key}'`);
            }
        }
        const secretResolver = invocationSecrets ? new InvocationSecretResolver(invocationSecrets) :
            this.fallbackSecretResolver;
        logger.debug("Applying secrets");
        const target = h as any;
        const secrets: any[] =
            target.__secrets ? target.__secrets : [];
        secrets.forEach(s => {
            h[s.name] = secretResolver.resolve(s.path);
        });
    }

    get rugs(): Rugs {
        return {
            name: this.opts.name,
            version: this.opts.version,
            team_id: this.opts.teamId,
            keywords: this.opts.keywords,
            commands: this.commandHandlers.map(e => e.metadata),
            events: this.eventHandlers.map(e => e.metadata),
            ingestors: this.ingestors.map(i => i.metadata),
        };
    }

}
