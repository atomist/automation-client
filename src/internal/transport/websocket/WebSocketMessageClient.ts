import { render, SlackMessage } from "@atomist/slack-messages/SlackMessages";
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
import { CommandIncoming, EventIncoming } from "../AutomationEventListener";

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
                message: render(msg, true),
                channels: Array.isArray(channelNames) ? channelNames as string[] : [ channelNames ],
                users: Array.isArray(userNames) ? userNames as string[] : [ userNames],
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
                channels: Array.isArray(channelNames) ? channelNames as string[] : [ channelNames ],
                users: Array.isArray(userNames) ? userNames as string[] : [ userNames],
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
}

export class WebSocketEventMessageClient extends AbstractWebSocketMessageClient {

    constructor(request: EventIncoming, automations: AutomationServer, ws: WebSocket) {
        super(automations, ws, request.extensions.correlation_id, { team: { id: request.extensions.team_id }});
    }

    public respond(msg: string | SlackMessage, options?: MessageOptions): Promise<any> {
        throw new Error("Response messages are not supported for event handlers");
    }
}

function mapActions(msg: SlackMessage, automations: AutomationServer): Action[] {
    const actions: Action[] = [];
    if (msg.attachments) {
        msg.attachments.filter(attachment => attachment.actions).forEach(attachment => {
            attachment.actions.forEach(a => {
                if ((a as CommandReferencingAction).command) {
                    const cra = a as CommandReferencingAction;
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
            parameters.push({
                name: key,
                value,
            });
        }
    }
    return parameters;
}

export function sendMessage(message: any, ws: WebSocket) {
    const payload = JSON.stringify(message, null, 2);
    logger.debug(`Sending message\n${payload}`);
    ws.send(payload);
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
