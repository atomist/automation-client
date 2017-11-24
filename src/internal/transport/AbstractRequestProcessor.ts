import { SlackMessage } from "@atomist/slack-messages";
import * as stringify from "json-stringify-safe";
import * as _ from "lodash";
import * as serializeError from "serialize-error";
import { AutomationContextAware } from "../../HandlerContext";
import {
    EventFired,
    failure,
    HandlerContext,
    HandlerResult,
} from "../../index";
import { AutomationEventListener } from "../../server/AutomationEventListener";
import { AutomationServer } from "../../server/AutomationServer";
import { GraphClient } from "../../spi/graph/GraphClient";
import { MessageClient, MessageOptions } from "../../spi/message/MessageClient";
import { ScriptAction } from "../common/Flushable";
import { CommandInvocation } from "../invoker/Payload";
import * as namespace from "../util/cls";
import { logger } from "../util/logger";
import {
    guid,
    hideString,
} from "../util/string";
import {
    CommandIncoming,
    EventIncoming,
    RequestProcessor,
} from "./RequestProcessor";
import {
    HandlerResponse,
    StatusMessage,
} from "./websocket/WebSocketMessageClient";

export abstract class AbstractRequestProcessor implements RequestProcessor {

    constructor(protected automations: AutomationServer,
                protected listeners: AutomationEventListener[] = []) { }

    public processCommand(command: CommandIncoming,
                          // tslint:disable-next-line:no-empty
                          callback: (result: Promise<HandlerResult>) => void = () => { }) {
        // setup context
        const ses = namespace.init();
        const cls = this.setupNamespace(command, this.automations);
        ses.run(() => {
            namespace.set(cls);

            this.listeners.forEach(l => l.commandIncoming(command));

            const np = namespace.get();
            const ci: CommandInvocation = {
                name: command.name,
                args: command.parameters,
                mappedParameters: command.mapped_parameters,
                secrets: command.secrets,
            };
            const ctx: HandlerContext & AutomationContextAware = {
                teamId: command.team.id,
                correlationId: command.corrid,
                invocationId: np ? np.invocationId : undefined,
                messageClient: this.createAndWrapMessageClient(command, { context: cls}),
                graphClient: this.createGraphClient(command, { context: cls}),
                context: cls,
            };

            this.listeners.forEach(l => l.contextCreated(ctx));
            this.listeners.forEach(l => l.commandStarting(ci, ctx));

            this.invokeCommand(ci, ctx, command, callback);
        });
    }

    public processEvent(event: EventIncoming,
                        // tslint:disable-next-line:no-empty
                        callback: (results: Promise<HandlerResult[]>) => void = () => { }) {
        // setup context
        const ses = namespace.init();
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
            const ctx: HandlerContext & AutomationContextAware = {
                teamId: event.extensions.team_id,
                correlationId: event.extensions.correlation_id,
                invocationId: np ? np.invocationId : undefined,
                messageClient: this.createAndWrapMessageClient(event, { context: cls}),
                graphClient: this.createGraphClient(event, { context: cls}),
                context: cls,
            };

            this.listeners.forEach(l => l.contextCreated(ctx));
            this.listeners.forEach(l => l.eventStarting(ef, ctx));

            this.invokeEvent(ef, ctx, event, callback);
        });
    }

    public sendStatus(success: boolean,
                      hr: HandlerResult,
                      request: CommandIncoming,
                      ctx: HandlerContext & AutomationContextAware): Promise<any> {
        // send success message back
        const status: StatusMessage = {
            status: success ? "success" : "failure",
            code: hr.code,
            message: `${success ? "Successfully" : "Unsuccessfully"} invoked command-handler` +
            ` ${request.name} of ${this.automations.automations.name}@${this.automations.automations.version}`,
        };
        const response: HandlerResponse = {
            rug: request.rug,
            corrid: request.corrid,
            correlation_context: request.correlation_context,
            content_type: "application/x-atomist-status+json",
            message: JSON.stringify(status),
        };
        return this.sendStatusMessage(response, ctx);
    }

    protected invokeCommand(ci: CommandInvocation,
                            ctx: HandlerContext & AutomationContextAware,
                            command: CommandIncoming,
                            callback: (result: Promise<HandlerResult>) => void) {

        const finalize = (result: HandlerResult) => {
            this.sendStatus(result.code === 0 ? true : false, result, command, ctx)
                .then(() => {
                    callback(Promise.resolve(result));
                    logger.info(`Finished invocation of command handler '%s': %s`,
                        command.name, stringify(result));
                    this.clearNamespace();
                });
        };

        logger.debug("Incoming command '%s'", stringify(command, replacer));
        try {
            this.automations.invokeCommand(ci, ctx)
                .then(result => {
                    if (!result || !result.hasOwnProperty("code")) {
                        result = defaultResult(ctx);
                    }

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

        const finalize = (result: HandlerResult[]) => {
            callback(Promise.resolve(result));
            logger.info(`Finished invocation of event handler '%s': %s`,
                event.extensions.operationName, stringify(result));
            this.clearNamespace();
        };

        logger.debug("Incoming event '%s'", stringify(event, replacer));
        try {
            this.automations.onEvent(ef, ctx)
                .then(result => {
                    if (!result || result.length === 0) {
                        result = [defaultResult(ctx)];
                    }

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
                                         context: AutomationContextAware): MessageClient {
        return new AutomationEventListenerEnabledMessageClient(
            this.createMessageClient(event, context), this.listeners);
    }

    protected setupNamespace(request: any,
                             automations: AutomationServer,
                             invocationId: string = guid(),
                             ts: number = Date.now()) {
        return {
            correlationId: _.get(request, "corrid") || _.get(request, "extensions.correlation_id"),
            teamId: _.get(request, "team.id") || _.get(request, "extensions.team_id"),
            teamName: _.get(request, "team.name") || _.get(request, "extensions.team_name"),
            operation: _.get(request, "name") || _.get(request, "extensions.operationName"),
            name: automations.automations.name,
            version: automations.automations.version,
            invocationId,
            ts,
        };
    }

    protected clearNamespace() {
        namespace.set({
            correlationId: null,
            teamId: null,
            teamName: null,
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
                                         context: AutomationContextAware): GraphClient;

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

        this.listeners.map(l => () => l.commandFailed(ci, ctx, result))
            .reduce((p, f) => p.then(f), Promise.resolve())
            .then(() => {
                this.sendStatus(false, result as HandlerResult, command, ctx);
                if (callback) {
                    callback(Promise.resolve(result));
                }
                logger.error(`Failed invocation of command handler '%s'`, command.name, serializeError(err));
                this.clearNamespace();
            });
    }

    private handleEventError(err: any, event: EventIncoming, ef: EventFired<any>,
                             ctx: HandlerContext & AutomationContextAware, callback: (error: any) => void) {
        const result = {
            ...defaultErrorResult(ctx),
            ...failure(err),
        };

        this.listeners.map(l => () => l.eventFailed(ef, ctx, result))
            .reduce((p, f) => p.then(f), Promise.resolve())
            .then(() => {
                if (callback) {
                    callback(Promise.resolve(result));
                }
                logger.error(`Failed invocation of command handler '%s'`,
                    event.extensions.operationName, serializeError(err));
                this.clearNamespace();
            });
    }
}

class AutomationEventListenerEnabledMessageClient implements MessageClient {

    constructor(private delegate: MessageClient, private listeners: AutomationEventListener[] = []) {}

    public respond(msg: string | SlackMessage,
                   options?: MessageOptions): Promise<any> {
        this.listeners.forEach(l => l.messageSent(msg, [], [], options));
        return this.delegate.respond(msg, options);
    }

    public addressUsers(msg: string | SlackMessage,
                        userNames: string | string[],
                        options?: MessageOptions): Promise<any> {
        this.listeners.forEach(l => l.messageSent(msg, userNames, [], options));
        return this.delegate.addressUsers(msg, userNames, options);
    }

    public addressChannels(msg: string | SlackMessage,
                           channelNames: string | string[],
                           options?: MessageOptions): Promise<any> {
        this.listeners.forEach(l => l.messageSent(msg, [], channelNames, options));
        return this.delegate.addressChannels(msg, channelNames, options);
    }

    public recordRespond(msg: string | SlackMessage,
                         options?: MessageOptions): this {
        return this.delegate.recordRespond(msg, options) as this;
    }

    public recordAddressUsers(msg: string | SlackMessage,
                              userNames: string | string[],
                              options?: MessageOptions): this {
        return this.delegate.recordAddressUsers(msg, userNames, options) as this;
    }

    public recordAddressChannels(msg: string | SlackMessage,
                                 channelNames: string | string[],
                                 options?: MessageOptions): this {
        return this.delegate.recordAddressChannels(msg, channelNames, options) as this;
    }

    public recordAction(action: ScriptAction<MessageClient, any>): this {
        return this.delegate.recordAction(action) as this;
    }

    public flush(): Promise<this> {
        return this.delegate.flush() as Promise<this>;

    }

    public get dirty() {
        return this.delegate.dirty;
    }
}

export function defaultResult(context: AutomationContextAware): HandlerResult {
    const result = {
        code: 0,
        message: `Command '${context.context.operation}' completed successfully`,
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

function replacer(key: string, value: any) {
    if (key === "secrets" && value) {
        return value.map(v => ({ name: v.name, value: hideString(v.value) }));
    } else {
        return value;
    }
}
