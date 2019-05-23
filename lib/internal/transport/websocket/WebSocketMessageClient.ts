import {
    render,
    SlackMessage,
} from "@atomist/slack-messages";
import * as _ from "lodash";
import { Config } from "winston/lib/winston/config";
import * as WebSocket from "ws";
import { Configuration } from "../../../configuration";
import {
    CommandReferencingAction,
    CustomEventDestination,
    Destination,
    isFileMessage,
    isSlackMessage,
    MessageMimeTypes,
    MessageOptions,
    RequiredMessageOptions,
    SlackDestination,
    WebDestination,
} from "../../../spi/message/MessageClient";
import { MessageClientSupport } from "../../../spi/message/MessageClientSupport";
import { logger } from "../../../util/logger";
import { redact } from "../../../util/redact";
import {
    guid,
    replacer,
    toStringArray,
} from "../../util/string";
import {
    CommandIncoming,
    EventIncoming,
    isCommandIncoming,
    isEventIncoming,
    Source,
} from "../RequestProcessor";
import { WebSocketLifecycle } from "./WebSocketLifecycle";

export abstract class AbstractWebSocketMessageClient extends MessageClientSupport {

    constructor(private ws: WebSocketLifecycle,
                private request: CommandIncoming | EventIncoming,
                private correlationId: string,
                private team: { id: string, name?: string },
                private source: Source,
                private configuration: Configuration) {
        super();
    }

    public async delete(destinations: Destination | Destination[],
                        options: RequiredMessageOptions): Promise<void> {
        return this.doSend(undefined, destinations, { ...options, delete: true });
    }

    protected async doSend(msg: string | SlackMessage,
                           destinations: Destination | Destination[],
                           options: MessageOptions = {}): Promise<any> {
        const ts = this.ts(options);

        if (!Array.isArray(destinations)) {
            destinations = [destinations];
        }

        let destinationIdentifier: "slack" | "ingester" | "web";
        const responseDestinations = [];

        let thread_ts;
        if (options.thread === true && !!this.source) {
            thread_ts = _.get(this.source, "slack.message.ts");
        } else if (typeof options.thread === "string") {
            thread_ts = options.thread;
        }

        destinations.forEach(d => {
            if (d.userAgent === SlackDestination.SLACK_USER_AGENT) {
                destinationIdentifier = "slack";

                const sd = d as SlackDestination;

                toStringArray(sd.channels).filter(c => !!c).forEach(c => {
                    responseDestinations.push({
                        user_agent: SlackDestination.SLACK_USER_AGENT,
                        slack: {
                            team: {
                                id: sd.team,
                            },
                            channel: {
                                name: c,
                            },
                            thread_ts,
                        },
                    });
                });

                toStringArray(sd.users).filter(u => !!u).forEach(u => {
                    responseDestinations.push({
                        user_agent: SlackDestination.SLACK_USER_AGENT,
                        slack: {
                            team: {
                                id: sd.team,
                            },
                            user: {
                                name: u,
                            },
                            thread_ts,
                        },
                    });
                });
            } else if (d.userAgent === CustomEventDestination.INGESTER_USER_AGENT) {
                destinationIdentifier = "ingester";
                responseDestinations.push({
                    user_agent: CustomEventDestination.INGESTER_USER_AGENT,
                    ingester: {
                        root_type: (d as CustomEventDestination).rootType,
                    },
                });
            } else if (d.userAgent === WebDestination.WEB_USER_AGENT) {
                destinationIdentifier = "web";
            }
        });

        if (responseDestinations.length === 0 && this.source) {
            // TODO CD this is probably not always going to be valid
            destinationIdentifier = "slack";
            const responseDestination = _.cloneDeep(this.source) as Source;
            if (responseDestination.slack) {
                delete responseDestination.slack.user;
            }
            responseDestinations.push(this.source);
        }

        const response: HandlerResponse = {
            api_version: "1",
            correlation_id: this.correlationId,
            team: this.team,
            source: this.source ? this.source : undefined,
            command: isCommandIncoming(this.request) ? this.request.command : undefined,
            event: isEventIncoming(this.request) ? this.request.extensions.operationName : undefined,
            destinations: responseDestinations,
            id: options.id ? options.id.replace(/ /g, "_") : undefined,
            timestamp: ts,
            ttl: ts && options.ttl ? options.ttl : undefined,
            post_mode: options.post === "update_only" ? "update_only" : (options.post === "always" ? "always" : "ttl"),
        };

        if (destinationIdentifier === "web") {
            return Promise.resolve();
        } else if (destinationIdentifier === "slack") {
            if (isSlackMessage(msg)) {
                const msgClone = _.cloneDeep(msg);
                const actions = mapActions(msgClone);
                response.content_type = MessageMimeTypes.SLACK_JSON;
                response.body = render(msgClone, false);
                response.actions = actions;
            } else if (isFileMessage(msg)) {
                response.content_type = MessageMimeTypes.SLACK_FILE_JSON;
                response.body = JSON.stringify({
                    content: msg.content,
                    filename: msg.fileName,
                    filetype: msg.fileType,
                    title: msg.title,
                    initial_comment: msg.comment,
                });
            } else if (typeof msg === "string") {
                response.content_type = MessageMimeTypes.PLAIN_TEXT;
                response.body = msg as string;
            } else if (!!options.delete) {
                response.content_type = "application/x-atomist-delete";
                response.body === undefined;
            }
            if (_.get(this.configuration, "redact.messages", true) === true) {
                response.body = redact(response.body);
            }
        } else if (destinationIdentifier === "ingester") {
            response.content_type = MessageMimeTypes.APPLICATION_JSON;
            response.body = JSON.stringify(msg);
            response.id = (options.id ? options.id : guid());
        }
        this.ws.send(response);
        return Promise.resolve(response);
    }

    private ts(options: MessageOptions): number {
        if (options.id) {
            if (options.ts) {
                return options.ts;
            } else {
                return Date.now();
            }
        } else {
            return undefined;
        }
    }
}

export class WebSocketCommandMessageClient extends AbstractWebSocketMessageClient {

    constructor(request: CommandIncoming, ws: WebSocketLifecycle, configuration: Configuration) {
        super(ws, request, request.correlation_id, request.team, request.source, configuration);
    }

    protected async doSend(msg: string | SlackMessage,
                           destinations: Destination | Destination[],
                           options: MessageOptions = {}): Promise<any> {
        return super.doSend(msg, destinations, options);
    }
}

export class WebSocketEventMessageClient extends AbstractWebSocketMessageClient {

    constructor(request: EventIncoming, ws: WebSocketLifecycle, configuration: Configuration) {
        super(ws, request, request.extensions.correlation_id,
            { id: request.extensions.team_id, name: request.extensions.team_name }, null, configuration);
    }

    protected async doSend(msg: string | SlackMessage,
                           destinations: Destination | Destination[],
                           options: MessageOptions = {}): Promise<any> {
        if (!Array.isArray(destinations)) {
            destinations = [destinations];
        }

        if (destinations.length === 0) {
            throw new Error("Response messages are not supported for event handlers");
        } else {
            return super.doSend(msg, destinations, options);
        }
    }
}

export function mapActions(msg: SlackMessage): Action[] {
    const actions: Action[] = [];

    let counter = 0;

    if (msg.attachments) {
        msg.attachments.filter(attachment => attachment.actions).forEach(attachment => {
            attachment.actions.forEach(a => {
                if ((a as CommandReferencingAction).command) {
                    const cra = a as CommandReferencingAction;

                    const id = counter++;
                    cra.command.id = `${cra.command.id}-${id}`;
                    a.name = `${a.name}-${id}`;

                    const action: Action = {
                        id: cra.command.id,
                        parameter_name: cra.command.parameterName,
                        command: cra.command.name,
                        parameters: mapParameters(cra.command.parameters),
                    };

                    actions.push(action);
                    // Lastly we need to delete our extension from the slack action
                    cra.command = undefined;
                }
            });
        });
        return actions;
    }
}

function mapParameters(data: {}): Parameter[] {
    const parameters: Parameter[] = [];
    for (const key in data) {
        if (data.hasOwnProperty(key)) {
            const value = data[key];
            if (value) {
                parameters.push({
                    name: key,
                    value: value.toString(),
                });
            } else {
                // logger.debug(`Parameter value for '${key}' is null`);
            }
        }
    }
    return parameters;
}

export function sendMessage(message: any, ws: WebSocket, log: boolean = true): void {
    if (log) {
        logger.debug(`Sending message '${JSON.stringify(message, replacer)}'`);
    }
    ws.send(JSON.stringify(message));
}

export function clean(addresses: string[] | string): string[] {
    let na: string[] = toStringArray(addresses);
    if (na) {
        // Filter out any null addresses
        na = na.filter(nad => nad !== null && nad.length > 0);
    }
    return na;
}

export interface HandlerResponse {
    api_version: "1";

    correlation_id: any;

    team: {
        id: string;
        name?: string;
    };

    command?: string;
    event?: string;

    status?: {
        code: number;
        reason: string;
    };

    source?: Source;

    destinations?: any[];

    content_type?: string;

    body?: string;

    // Updatable messages
    id?: string;
    timestamp?: number;
    ttl?: number;
    post_mode?: "ttl" | "always" | "update_only";

    actions?: Action[];
}

export interface Action {
    id: string;
    parameter_name?: string;
    command: string;
    parameters: Parameter[];
}

export interface Parameter {
    name: string;
    value: string;
}
