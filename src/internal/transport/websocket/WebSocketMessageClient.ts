import {
    render,
    SlackMessage,
} from "@atomist/slack-messages/SlackMessages";
import * as _ from "lodash";
import * as WebSocket from "ws";
import { AutomationServer } from "../../../server/AutomationServer";
import {
    CommandReferencingAction,
    isSlackMessage,
    MessageMimeTypes,
    MessageOptions,
} from "../../../spi/message/MessageClient";
import { MessageClientSupport } from "../../../spi/message/MessageClientSupport";
import { logger } from "../../util/logger";
import { toStringArray } from "../../util/string";
import {
    CommandIncoming,
    EventIncoming, Source,
} from "../RequestProcessor";

export abstract class AbstractWebSocketMessageClient extends MessageClientSupport {

    constructor(private automations: AutomationServer,
                private ws: WebSocket,
                private correlationId: string,
                private team: { id: string, name?: string },
                private source: Source) {
        super();
    }

    protected async doSend(msg: string | SlackMessage,
                           team: string,
                           users: string | string[],
                           channels: string | string[],
                           options: MessageOptions = {}): Promise<any> {
        const ts = this.ts(options);
        const destinations: Destination[] = [];

        (users as string[]).forEach(user => {
           destinations.push({
               user_agent: "slack",
               slack: {
                   team: {
                       id: team,
                   },
                   user: {
                       name: user,
                   },
               },
           });
        });
        (channels as string[]).forEach(channel => {
            destinations.push({
                user_agent: "slack",
                slack: {
                    team: {
                        id: team,
                    },
                    channel: {
                        name: channel,
                    },
                },
            });
        });
        if (destinations.length === 0 && this.source) {
            destinations.push(this.source);
        }

        if (isSlackMessage(msg)) {
            const actions = mapActions(msg, this.automations.automations.name, this.automations.automations.version);
            const response: HandlerResponse = {
                api_version: "1",
                correlation_id: this.correlationId,
                content_type: MessageMimeTypes.SLACK_JSON,
                team: this.team,
                body: render(msg, false),
                destinations,
                id: options.id,
                timestamp: ts ? ts.toString() : undefined,
                ttl: ts && options.ttl ? (ts + options.ttl).toString() : undefined,
                updates_only: options.post === "update_only",
                actions,
            };
            sendMessage(response, this.ws);
            return Promise.resolve(response);
        } else {
            const response: HandlerResponse = {
                api_version: "1",
                correlation_id: this.correlationId,
                content_type: MessageMimeTypes.PLAIN_TEXT,
                team: this.team,
                body: msg as string,
                destinations,
                id: options.id,
                timestamp: ts ? ts.toString() : undefined,
                ttl: ts && options.ttl ? (ts + options.ttl).toString() : undefined,
                updates_only: options.post === "update_only",
            };
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

    constructor(request: CommandIncoming, automations: AutomationServer, ws: WebSocket) {
        super(automations, ws, request.correlation_id, request.team, request.source);
    }

    protected async doSend(msg: string | SlackMessage,
                           team: string,
                           userNames: string | string[],
                           channelNames: string | string[],
                           options: MessageOptions = {}): Promise<any> {
        const users = clean(userNames);
        const channels = clean(channelNames);

        return super.doSend(msg, team, users, channels, options);
    }
}

export class WebSocketEventMessageClient extends AbstractWebSocketMessageClient {

    constructor(request: EventIncoming, automations: AutomationServer, ws: WebSocket) {
        super(automations, ws, request.extensions.correlation_id,
            { id: request.extensions.team_id, name: request.extensions.team_name }, null);
    }

    protected async doSend(msg: string | SlackMessage,
                           team: string,
                           userNames: string | string[],
                           channelNames: string | string[],
                           options: MessageOptions = {}): Promise<any> {
        const users = clean(userNames);
        const channels = clean(channelNames);

        if (users.length === 0 && channels.length === 0) {
            throw new Error("Response messages are not supported for event handlers");
        } else {
            return super.doSend(msg, team, users, channels, options);
        }
    }
}

export function mapActions(msg: SlackMessage, artifact: string, version: string): Action[] {
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
        logger.debug(`Sending message: ${payload}`);
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

    status?: {
        code: number;
        reason: string;
    };

    destinations?: Destination[];

    content_type?: "application/x-atomist-slack+json" | "text/plain";

    body?: string;

    // Updatable messages
    timestamp?: string;
    id?: string;
    ttl?: string;
    updates_only?: boolean;

    actions?: Action[];
}

export interface Destination {
    user_agent: "slack";
    slack?: {
        team: {
            id: string;
        };
        channel?: {
            id?: string;
            name?: string;
        };
        user?: {
            id?: string;
            name?: string;
        };
        thread_ts?: string;
    };
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
