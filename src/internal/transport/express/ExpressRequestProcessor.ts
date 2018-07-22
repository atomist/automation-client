import WebSocket = require("ws");
import { automationClientInstance } from "../../../globals";
import { ApolloGraphClient } from "../../../graph/ApolloGraphClient";
import {
    AutomationContextAware,
    HandlerContext,
} from "../../../HandlerContext";
import { AutomationEventListener } from "../../../server/AutomationEventListener";
import { AutomationServer } from "../../../server/AutomationServer";
import { GraphClient } from "../../../spi/graph/GraphClient";
import {
    Destination,
    MessageClient,
    MessageOptions,
} from "../../../spi/message/MessageClient";
import * as namespace from "../../util/cls";
import { AbstractRequestProcessor } from "../AbstractRequestProcessor";
import {
    CommandIncoming,
    EventIncoming,
    isCommandIncoming,
    isEventIncoming,
} from "../RequestProcessor";
import {
    WebSocketCommandMessageClient,
    WebSocketEventMessageClient,
} from "../websocket/WebSocketMessageClient";
import { ExpressServerOptions } from "./ExpressServer";

/**
 * RequestProcessor implementation used by the Express infrastructure to process
 * inbound events via HTTP REST apis.
 */
export class ExpressRequestProcessor extends AbstractRequestProcessor {

    private messages: any[] = [];

    constructor(private token: string,
                protected automations: AutomationServer,
                protected listeners: AutomationEventListener[] = [],
                private options: ExpressServerOptions) {
        super(automations, listeners);
    }

    protected sendStatusMessage(payload: any, ctx: HandlerContext & AutomationContextAware): Promise<any> {
        return Promise.resolve();
    }

    protected createGraphClient(event: EventIncoming | CommandIncoming,
                                context: AutomationContextAware): GraphClient {
        const teamId = namespace.get().teamId;
        return !!this.options.graphClientFactory ?
            this.options.graphClientFactory(context) :
            new ApolloGraphClient(`${this.options.endpoint.graphql}/${teamId}`,
                { Authorization: `token ${this.token}` });
    }

    protected createMessageClient(event: EventIncoming | CommandIncoming,
                                  context: AutomationContextAware): MessageClient {
        return !!this.options.messageClientFactory ?
            this.options.messageClientFactory(context) :
            new ExpressMessageClient(this.messages, event);
    }
}

class ExpressMessageClient implements MessageClient {

    private delegate: MessageClient;

    constructor(private messages: any[], private event: EventIncoming | CommandIncoming) {
        if (automationClientInstance().webSocketHandler
            && (automationClientInstance().webSocketHandler as any).webSocket) {
            const ws = (automationClientInstance().webSocketHandler as any).webSocket as WebSocket;
            if (isCommandIncoming(this.event)) {
                this.delegate = new WebSocketCommandMessageClient(this.event, ws);
            } else if (isEventIncoming(this.event)) {
                this.delegate = new WebSocketEventMessageClient(this.event, ws);
            }
        }
    }

    public respond(msg: any, options?: MessageOptions): Promise<any> {
        this.messages.push(msg);
        if (this.delegate) {
            return this.delegate.respond(msg, options);
        } else {
            return Promise.resolve();
        }
    }

    public send(msg: any, destinations: Destination | Destination[], options?: MessageOptions): Promise<any> {
        this.messages.push(msg);
        if (this.delegate) {
            return this.delegate.send(msg, destinations, options);
        } else {
            return Promise.resolve();
        }
    }
}
