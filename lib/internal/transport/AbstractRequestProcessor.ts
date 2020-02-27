import * as stringify from "json-stringify-safe";
import * as _ from "lodash";
import { Configuration } from "../../configuration";
import { eventStore } from "../../globals";
import { EventFired } from "../../HandleEvent";
import {
    AutomationContextAware,
    ConfigurationAware,
    HandlerContext,
} from "../../HandlerContext";
import {
    failure,
    HandlerResult,
} from "../../HandlerResult";
import { AutomationEventListener } from "../../server/AutomationEventListener";
import { AutomationServer } from "../../server/AutomationServer";
import { GraphClient } from "../../spi/graph/GraphClient";
import {
    Destination,
    MessageClient,
    MessageOptions,
    RequiredMessageOptions,
    SlackMessageClient,
} from "../../spi/message/MessageClient";
import { DefaultSlackMessageClient } from "../../spi/message/MessageClientSupport";
import { logger } from "../../util/logger";
import {
    dispose,
    registerDisposable,
} from "../invoker/disposable";
import { CommandInvocation } from "../invoker/Payload";
import * as namespace from "../util/cls";
import {
    guid,
    replacer,
} from "../util/string";
import {
    CommandIncoming,
    EventIncoming,
    RequestProcessor,
} from "./RequestProcessor";
import { HandlerResponse } from "./websocket/WebSocketMessageClient";

export abstract class AbstractRequestProcessor implements RequestProcessor {

    constructor(protected automations: AutomationServer,
                protected configuration: Configuration,
                protected listeners: AutomationEventListener[] = []) {
    }

    public processCommand(command: CommandIncoming,
                          // tslint:disable-next-line:no-empty
                          callback: (result: Promise<HandlerResult>) => void = () => {
                          }) {
        // setup context
        const ses = namespace.create();
        const cls = this.setupNamespace(command, this.automations);
        ses.run(() => {
            namespace.set(cls);

            this.listeners.forEach(l => l.commandIncoming(command));

            const np = namespace.get();
            const ci: CommandInvocation = {
                name: command.command,
                args: command.parameters,
                mappedParameters: command.mapped_parameters,
                secrets: command.secrets,
            };
            const ctx: HandlerContext & AutomationContextAware & ConfigurationAware = {
                workspaceId: command.team.id,
                source: command.source,
                correlationId: command.correlation_id,
                invocationId: np ? np.invocationId : undefined,
                messageClient: undefined,
                context: cls,
                trigger: _.cloneDeep(command),
                configuration: this.configuration,
            };

            ctx.graphClient = this.createGraphClient(command, ctx);
            ctx.messageClient = this.createAndWrapMessageClient(command, ctx);
            ctx.lifecycle = {
                registerDisposable: registerDisposable(ctx),
                dispose: dispose(ctx),
            };

            this.listeners.forEach(l => l.contextCreated(ctx));
            this.listeners.forEach(l => l.commandStarting(ci, ctx));

            this.invokeCommand(ci, ctx, command, callback);
        });
    }

    public processEvent(event: EventIncoming,
                        // tslint:disable-next-line:no-empty
                        callback: (results: Promise<HandlerResult[]>) => void = () => {
                        }) {
        // setup context
        const ses = namespace.create();
        const cls = this.setupNamespace(event, this.automations);
        ses.run(() => {
            namespace.set(cls);

            this.listeners.forEach(l => l.eventIncoming(event));

            const np = namespace.get();
            const ef: EventFired<any> = {
                data: event.data,
                extensions: {
                    operationName: event.extensions.operationName,
                },
                secrets: event.secrets,
            };
            const ctx: HandlerContext & AutomationContextAware & ConfigurationAware = {
                workspaceId: event.extensions.team_id,
                correlationId: event.extensions.correlation_id,
                invocationId: np ? np.invocationId : undefined,
                messageClient: undefined,
                context: cls,
                trigger: _.cloneDeep(event),
                configuration: this.configuration,
            };

            ctx.graphClient = this.createGraphClient(event, ctx);
            ctx.messageClient = this.createAndWrapMessageClient(event, ctx);
            ctx.lifecycle = {
                registerDisposable: registerDisposable(ctx),
                dispose: dispose(ctx),
            };

            this.listeners.forEach(l => l.contextCreated(ctx));
            this.listeners.forEach(l => l.eventStarting(ef, ctx));

            this.invokeEvent(ef, ctx, event, callback);
        });
    }

    public sendCommandStatus(success: boolean,
                             code: number,
                             request: CommandIncoming,
                             ctx: HandlerContext & AutomationContextAware): Promise<any> {
        if (code === -1) {
            return;
        }
        const source = _.cloneDeep(request.source);
        if (source && source.slack) {
            delete source.slack.user;
        }

        const response: HandlerResponse = {
            api_version: "1",
            correlation_id: request.correlation_id,
            team: request.team,
            command: request.command,
            source: request.source,
            destinations: [source],
            status: {
                code,
                reason: `${success ? "Successfully" : "Unsuccessfully"} invoked command` +
                    ` ${request.command} of ${this.automations.automations.name}@${this.automations.automations.version}`,
            },
        };
        return this.sendStatusMessage(response, ctx);
    }

    public sendEventStatus(success: boolean,
                           request: EventFired<any>,
                           event: EventIncoming,
                           ctx: HandlerContext & AutomationContextAware): Promise<any> {
        const response: HandlerResponse = {
            api_version: "1",
            correlation_id: event.extensions.correlation_id,
            team: {
                id: event.extensions.team_id,
                name: event.extensions.team_name,
            },
            event: request.extensions.operationName,
            status: {
                code: success ? 0 : 1,
                reason: `${success ? "Successfully" : "Unsuccessfully"} invoked event subscription` +
                    ` ${request.extensions.operationName} of ${this.automations.automations.name}@${this.automations.automations.version}`,
            },
        };
        return this.sendStatusMessage(response, ctx);
    }

    protected invokeCommand(ci: CommandInvocation,
                            ctx: HandlerContext & AutomationContextAware,
                            command: CommandIncoming,
                            callback: (result: Promise<HandlerResult>) => void) {

        const finalize = (result: HandlerResult) => {
            this.sendCommandStatus(result.code === 0, result.code, command, ctx)
                .catch(err =>
                    logger.warn("Unable to send status for command '%s': %s", command.command, err.message))
                .then(() => {
                    callback(Promise.resolve(result));
                    logger.debug(`Finished invocation of command '%s': %s`,
                        command.command, stringify(result, possibleAxiosObjectReplacer));
                    this.clearNamespace();
                });
        };

        logger.debug("Incoming command invocation '%s'", stringify(command, replacer));
        try {
            this.automations.invokeCommand(ci, ctx)
                .then(result => {
                    if (!result || !result.hasOwnProperty("code")) {
                        return {
                            ...defaultResult(ctx),
                            ...result,
                        };
                    } else {
                        return result;
                    }
                })
                .then(result => ctx.lifecycle ? ctx.lifecycle.dispose().then(() => result) : result)
                .then(result => {
                    if (result.code === 0) {
                        result = {
                            ...defaultResult(ctx),
                            ...result,
                        };
                        this.listeners.map(l => () => l.commandSuccessful(ci, ctx, result))
                            .reduce((p, f) => p.then(f), Promise.resolve())
                            .then(() => finalize(result));
                    } else {
                        result = {
                            ...defaultErrorResult(ctx),
                            ...result,
                        };
                        this.listeners.map(l => () => l.commandFailed(ci, ctx, result))
                            .reduce((p, f) => p.then(f), Promise.resolve())
                            .then(() => finalize(result));
                    }
                })
                .catch(err => {
                    this.handleCommandError(err, command, ci, ctx, callback);
                });
        } catch (err) {
            this.handleCommandError(err, command, ci, ctx, callback);
        }
    }

    protected invokeEvent(ef: EventFired<any>,
                          ctx: HandlerContext & AutomationContextAware,
                          event: EventIncoming,
                          callback: (results: Promise<HandlerResult[]>) => void) {

        const finalize = (results: HandlerResult[]) => {
            let noncircularResults = results;
            try {
                JSON.stringify(noncircularResults);
            } catch (err) {
                logger.error("Circular object returned from event handler: %s", stringify(results));
                noncircularResults = results.map(r => ({ code: r.code, message: stringify(r.message) }));
                logger.error("Substituting for circular object: %j", noncircularResults);
            }

            this.sendEventStatus(!noncircularResults.some(r => r.code !== 0), ef, event, ctx)
                .catch(err =>
                    logger.warn("Unable to send status for event subscription'%s': %s",
                        event.extensions.operationName, err.message))
                .then(() => {
                    callback(Promise.resolve(noncircularResults));
                    logger.debug(`Finished invocation of event subscription '%s': %s`,
                        event.extensions.operationName, stringify(noncircularResults, possibleAxiosObjectReplacer));
                    this.clearNamespace();
                });
        };

        logger.debug("Incoming event subscription '%s'", stringify(event, replacer));
        try {
            this.automations.onEvent(ef, ctx)
                .then(result => {
                    if (!result || result.length === 0) {
                        return [defaultResult(ctx)];
                    } else {
                        return result;
                    }
                })
                .then(result => ctx.lifecycle ? ctx.lifecycle.dispose().then(() => result) : result)
                .then(result => {

                    if (!result.some(r => r.code !== 0)) {
                        this.listeners.map(l => () => l.eventSuccessful(ef, ctx, result))
                            .reduce((p, f) => p.then(f), Promise.resolve())
                            .then(() => finalize(result));
                    } else {
                        this.listeners.map(l => () => l.eventFailed(ef, ctx, result))
                            .reduce((p, f) => p.then(f), Promise.resolve())
                            .then(() => finalize(result));
                    }
                })
                .catch(err => {
                    this.handleEventError(err, event, ef, ctx, callback);
                });
        } catch (err) {
            this.handleEventError(err, event, ef, ctx, callback);
        }
    }

    protected createAndWrapMessageClient(event: EventIncoming | CommandIncoming,
                                         context: HandlerContext & AutomationContextAware): MessageClient & SlackMessageClient {
        return new DefaultSlackMessageClient(new AutomationEventListenerEnabledMessageClient(context,
            this.createMessageClient(event, context), this.listeners), context.graphClient);
    }

    protected setupNamespace(request: any,
                             automations: AutomationServer,
                             invocationId: string = guid(),
                             ts: number = Date.now()) {
        return {
            correlationId: _.get(request, "correlation_id") || _.get(request, "extensions.correlation_id"),
            workspaceId: _.get(request, "team.id") || _.get(request, "extensions.team_id"),
            workspaceName: _.get(request, "team.name") || _.get(request, "extensions.team_name"),
            operation: _.get(request, "command") || _.get(request, "extensions.operationName"),
            name: automations.automations.name,
            version: automations.automations.version,
            invocationId,
            ts,
        };
    }

    protected clearNamespace() {
        namespace.set({
            correlationId: null,
            workspaceId: null,
            workspaceName: null,
            operation: null,
            name: null,
            version: null,
            invocationId: null,
            ts: null,
        });
    }

    protected abstract sendStatusMessage(payload: any,
                                         ctx: HandlerContext & AutomationContextAware): Promise<any>;

    protected abstract createGraphClient(event: EventIncoming | CommandIncoming,
                                         context: HandlerContext & AutomationContextAware): GraphClient;

    protected abstract createMessageClient(event: EventIncoming | CommandIncoming,
                                           context: AutomationContextAware): MessageClient;

    private handleCommandError(err: any,
                               command: CommandIncoming,
                               ci: CommandInvocation,
                               ctx: HandlerContext & AutomationContextAware,
                               callback: (error: any) => void) {
        const result = {
            ...defaultErrorResult(ctx),
            ...failure(err),
        };

        this.listeners.map(l => () => l.commandFailed(ci, ctx, err))
            .reduce((p, f) => p.then(f), Promise.resolve())
            .then(() => {
                return this.sendCommandStatus(false, result.code, command, ctx)
                    .then(() => {
                        if (callback) {
                            callback(Promise.resolve(result));
                        }
                        if (err instanceof Error) {
                            logger.error(`Failed invocation of command '%s': %s`, command.command, err.message);
                            logger.error(err.stack);
                        } else {
                            logger.error(`Failed invocation of command '%s'`, command.command);
                        }
                        this.clearNamespace();
                    })
                    .catch(error => logger.warn("Unable to send status for command: " + stringify(command)));
            });
    }

    private handleEventError(err: any, event: EventIncoming, ef: EventFired<any>,
                             ctx: HandlerContext & AutomationContextAware, callback: (error: any) => void) {
        const result = {
            ...defaultErrorResult(ctx),
            ...failure(err),
        };

        this.listeners.map(l => () => l.eventFailed(ef, ctx, err))
            .reduce((p, f) => p.then(f), Promise.resolve())
            .then(() => {
                return this.sendEventStatus(false, ef, event, ctx)
                    .then(() => {
                        if (callback) {
                            callback(Promise.resolve(result));
                        }
                        if (err instanceof Error) {
                            logger.error(`Failed invocation of event subscription '%s': %s`,
                                event.extensions.operationName, err.message);
                            logger.error(err.stack);
                        } else {
                            logger.error(`Failed invocation of event subscription '%s'`,
                                event.extensions.operationName);
                        }
                        this.clearNamespace();
                    })
                    .catch(error => logger.warn("Unable to send status for event subscription: " + stringify(event)));
            });
    }
}

class AutomationEventListenerEnabledMessageClient implements MessageClient {

    constructor(private readonly ctx: HandlerContext,
                private readonly delegate: MessageClient,
                private readonly listeners: AutomationEventListener[] = []) {
    }

    public async respond(msg: any,
                         options?: MessageOptions): Promise<any> {
        const newMsg = await this.listeners.map(
            l => m => l.messageSending(m.message || msg, [], m.options || options, this.ctx))
            .reduce((p, f) => p.then(f), Promise.resolve({ message: msg, destinations: [] as any, options }));

        eventStore().recordMessage(
            newMsg.options && newMsg.options.id ? newMsg.options.id : guid(),
            this.ctx.correlationId,
            newMsg.message);

        await this.delegate.respond(newMsg.message, newMsg.options);

        return Promise.all(
            this.listeners.map(
                l => l.messageSent(
                    newMsg.message,
                    [],
                    newMsg.options,
                    this.ctx),
            ),
        );
    }

    public async send(msg: any,
                      destinations: Destination | Destination[],
                      options?: MessageOptions): Promise<any> {
        const newMsg = await this.listeners.map(
            l => m => l.messageSending(m.message || msg, m.destinations || destinations, m.options || options, this.ctx))
            .reduce((p, f) => p.then(f), Promise.resolve({ message: msg, destinations, options }));

        eventStore().recordMessage(
            newMsg.options && newMsg.options.id ? newMsg.options.id : guid(),
            this.ctx.correlationId,
            newMsg.message);

        await this.delegate.send(newMsg.message, newMsg.destinations, newMsg.options);

        return Promise.all(
            this.listeners.map(
                l => l.messageSent(
                    newMsg.message,
                    newMsg.destinations,
                    newMsg.options,
                    this.ctx),
            ),
        );
    }

    public async delete(destinations: Destination | Destination[],
                        options: RequiredMessageOptions): Promise<void> {
        return this.delegate.delete(destinations, options);
    }
}

export function defaultResult(context: AutomationContextAware): HandlerResult {
    const result = {
        code: 0,
        correlation_id: context.context.correlationId,
        invocation_id: context.context.invocationId,
    };
    return result as HandlerResult;
}

export function defaultErrorResult(context: AutomationContextAware): HandlerResult {
    const result = {
        ...defaultResult(context),
        code: 1,
        message: `Command '${context.context.operation}' failed`,
    };
    return result as HandlerResult;
}

export function possibleAxiosObjectReplacer(key: string, value: any) {
    if ((key === "request" || key === "response") && !!value && stringify(value).length > 200) {
        return `<...elided because it might be a really long axios ${key}...>`;
    } else {
        return value;
    }
}
