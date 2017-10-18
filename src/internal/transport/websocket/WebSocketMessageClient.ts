import {
    render,
    SlackMessage,
} from "@atomist/slack-messages/SlackMessages";
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
    EventIncoming,
} from "../RequestProcessor";

export abstract class AbstractWebSocketMessageClient extends MessageClientSupport {

    constructor(private automations: AutomationServer, private ws: WebSocket, private correlationId: string,
                private correlationContext: any, private rug: any = {}) {
        super();
    }

    protected async doSend(msg: string | SlackMessage, userNames: string | string[],
                           channelNames: string | string[], options: MessageOptions = {}): Promise<any> {

        if (isSlackMessage(msg)) {
            const actions = mapActions(msg, this.automations);
            const response: HandlerResponse = {
                rug: this.rug,
                corrid: this.correlationId,
                correlation_context: this.correlationContext,
                content_type: MessageMimeTypes.SLACK_JSON,
                message: render(msg, false),
                channels: channelNames as string[],
                users: userNames as string[],
                message_id: options.id,
                timestamp: this.ts(options),
                ttl: options.ttl ? options.ttl.toString() : undefined,
                post: options.post,
                actions,
            };
            sendMessage(response, this.ws);
            return Promise.resolve(response);
        } else {
            const response: HandlerResponse = {
                rug: this.rug,
                corrid: this.correlationId,
                correlation_context: this.correlationContext,
                content_type: MessageMimeTypes.PLAIN_TEXT,
                message: msg as string,
                channels: channelNames as string[],
                users: userNames as string[],
                message_id: options.id,
                timestamp: this.ts(options),
                ttl: options.ttl ? options.ttl.toString() : undefined,
                post: options.post,
            };
            sendMessage(response, this.ws);
            return Promise.resolve(response);
        }
    }

    private ts(options: MessageOptions): string {
        if (options.id) {
            if (options.ts) {
                return Math.floor(options.ts).toString();
            } else {
                return Math.floor(new Date().getTime() / 1000).toString();
            }
        } else {
            return undefined;
        }
    }
}

export class WebSocketCommandMessageClient extends AbstractWebSocketMessageClient {

    constructor(request: CommandIncoming, automations: AutomationServer, ws: WebSocket) {
        super(automations, ws, request.corrid, request.correlation_context, request.rug);
    }

    protected async doSend(msg: string | SlackMessage, userNames: string | string[],
                           channelNames: string | string[], options: MessageOptions = {}): Promise<any> {
        const users = clean(userNames);
        const channels = clean(channelNames);

        return super.doSend(msg, users, channels, options);
    }
}

export class WebSocketEventMessageClient extends AbstractWebSocketMessageClient {

    constructor(request: EventIncoming, automations: AutomationServer, ws: WebSocket) {
        super(automations, ws, request.extensions.correlation_id, { team: { id: request.extensions.team_id }});
    }

    protected async doSend(msg: string | SlackMessage, userNames: string | string[],
                           channelNames: string | string[], options: MessageOptions = {}): Promise<any> {
        const users = clean(userNames);
        const channels = clean(channelNames);

        if (users.length === 0 && channels.length === 0) {
            throw new Error("Response messages are not supported for event handlers");
        } else {
            return super.doSend(msg, userNames, channelNames, options);
        }
    }
}

function mapActions(msg: SlackMessage, automations: AutomationServer): Action[] {
    const actions: Action[] = [];

    let counter = 0;

    if (msg.attachments) {
        msg.attachments.filter(attachment => attachment.actions).forEach(attachment => {
            attachment.actions.forEach(a => {
                if ((a as CommandReferencingAction).command) {
                    const cra = a as CommandReferencingAction;

                    const id = counter++;
                    cra.command.id = `${cra.command.id}-${id}`;
                    if (cra.command.parameterName) {
                        a.name = `${a.name}-${id}`;
                    } else {
                        a.value = `${a.value}-${id}`;
                    }

                    const action: Action = {
                        id: cra.command.id,
                        parameter_name: cra.command.parameterName,
                        parameters: mapParameters(cra.command.parameters),
                        rug: {
                            type: "command_handler",
                            group: "atomist",
                            artifact: "node",
                            version: automations.rugs.version,
                            name: cra.command.name,
                        },
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
    // Response messages
    rug?: any;
    corrid: string;
    correlation_context?: any;
    content_type: string;
    message: string;

    // Directed messages
    channels?: string[];
    users?: string[];

    // Updatable messages
    message_id?: string;
    timestamp?: string;
    ttl?: string;
    post?: string;

    actions?: Action[];
}

export interface Action {
    id: string;
    parameter_name?: string;
    rug: Rug;
    parameters: Parameter[];
}

export interface Rug {
    type: "command_handler";
    group: "atomist";
    artifact: "node";
    name: string;
    version: string;
}

export interface Parameter {
    name: string;
    value: string;
}

export interface StatusMessage {
    status: "success" | "failure";
    code: number;
    message: string;
}
