import {
    render,
    SlackMessage,
} from "@atomist/slack-messages/SlackMessages";
import * as _ from "lodash";
import * as WebSocket from "ws";
import {
    CommandReferencingAction,
    Destination,
    isSlackMessage,
    MessageMimeTypes,
    MessageOptions,
    SlackDestination,
    isFileMessage,
} from "../../../spi/message/MessageClient";
import { MessageClientSupport } from "../../../spi/message/MessageClientSupport";
import { logger } from "../../util/logger";
import { toStringArray } from "../../util/string";
import {
    CommandIncoming,
    EventIncoming,
    isCommandIncoming,
    isEventIncoming,
    Source,
} from "../RequestProcessor";

export abstract class AbstractWebSocketMessageClient extends MessageClientSupport {

    constructor(private ws: WebSocket,
        private request: CommandIncoming | EventIncoming,
        private correlationId: string,
        private team: { id: string, name?: string },
        private source: Source) {
        super();
    }

    protected async doSend(msg: string | SlackMessage,
        destinations: Destination | Destination[],
        options: MessageOptions = {}): Promise<any> {
        const ts = this.ts(options);

        if (!Array.isArray(destinations)) {
            destinations = [destinations];
        }

        const responseDestinations = [];
        destinations.forEach(d => {
            if (d.userAgent === SlackDestination.SLACK_USER_AGENT) {
                const sd = d as SlackDestination;

                toStringArray(sd.channels).forEach(c => {
                    responseDestinations.push({
                        user_agent: "slack",
                        slack: {
                            team: {
                                id: sd.team,
                            },
                            channel: {
                                name: c,
                            },
                        },
                    });
                });

                toStringArray(sd.users).forEach(c => {
                    responseDestinations.push({
                        user_agent: "slack",
                        slack: {
                            team: {
                                id: sd.team,
                            },
                            user: {
                                name: c,
                            },
                        },
                    });
                });
            }
        });

        if (responseDestinations.length === 0 && this.source) {
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
            source: this.source,
            command: isCommandIncoming(this.request) ? this.request.command : undefined,
            event: isEventIncoming(this.request) ? this.request.extensions.operationName : undefined,
            destinations: responseDestinations,
            id: options.id,
            timestamp: ts,
            ttl: ts && options.ttl ? options.ttl : undefined,
            post_mode: options.post === "update_only" ? "update_only" : (options.post === "always" ? "always" : "ttl"),
        };

        if (isSlackMessage(msg)) {
            const msgClone = _.cloneDeep(msg);
            const actions = mapActions(msgClone);
            response.content_type = MessageMimeTypes.SLACK_JSON;
            response.body = render(msgClone, false);
            response.actions = actions;
            sendMessage(response, this.ws);
            return Promise.resolve(response);
        } else if (isFileMessage(msg)) {
            response.content_type = "application/x-atomist-slack-file+json";
            response.body = render(msg, false);
            sendMessage(response, this.ws);
        } else {
            response.content_type = MessageMimeTypes.PLAIN_TEXT;
            response.body = msg as string;
            sendMessage(response, this.ws);
            return Promise.resolve(response);
        }
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

    constructor(request: CommandIncoming, ws: WebSocket) {
        super(ws, request, request.correlation_id, request.team, request.source);
    }

    protected async doSend(msg: string | SlackMessage,
        destinations: Destination | Destination[],
        options: MessageOptions = {}): Promise<any> {
        return super.doSend(msg, destinations, options);
    }
}

export class WebSocketEventMessageClient extends AbstractWebSocketMessageClient {

    constructor(request: EventIncoming, ws: WebSocket) {
        super(ws, request, request.extensions.correlation_id,
            { id: request.extensions.team_id, name: request.extensions.team_name }, null);
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

export function sendMessage(message: any, ws: WebSocket, log: boolean = true) {
    const payload = JSON.stringify(message);
    if (log) {
        logger.debug(`Sending message '${payload}'`);
    }
    ws.send(payload);
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

    content_type?: "application/x-atomist-slack+json" | "text/plain" | "application/x-atomist-slack-file+json";

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
