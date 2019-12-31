import { Configuration } from "../../../configuration";
import { automationClientInstance } from "../../../globals";
import {
    AutomationContextAware,
    HandlerContext,
} from "../../../HandlerContext";
import { AutomationEventListener } from "../../../server/AutomationEventListener";
import { AutomationServer } from "../../../server/AutomationServer";
import { GraphClient } from "../../../spi/graph/GraphClient";
import { GraphClientFactory } from "../../../spi/graph/GraphClientFactory";
import {
    Destination,
    MessageClient,
    MessageOptions,
    RequiredMessageOptions,
} from "../../../spi/message/MessageClient";
import { AbstractRequestProcessor } from "../AbstractRequestProcessor";
import {
    CommandIncoming,
    EventIncoming,
    isCommandIncoming,
    isEventIncoming,
    workspaceId,
} from "../RequestProcessor";
import { WebSocketLifecycle } from "../websocket/WebSocketLifecycle";
import {
    WebSocketCommandMessageClient,
    WebSocketEventMessageClient,
} from "../websocket/WebSocketMessageClient";

/**
 * RequestProcessor implementation used by the Express infrastructure to process
 * inbound events via HTTP REST apis.
 */
export class ExpressRequestProcessor extends AbstractRequestProcessor {

    private readonly graphClientFactory: GraphClientFactory;

    constructor(protected automations: AutomationServer,
                protected configuration: Configuration,
                protected listeners: AutomationEventListener[] = []) {
        super(automations, listeners);
        this.graphClientFactory = this.configuration.graphql.client.factory;
    }

    protected sendStatusMessage(payload: any, ctx: HandlerContext & AutomationContextAware): Promise<any> {
        return Promise.resolve();
    }

    protected createGraphClient(event: EventIncoming | CommandIncoming,
                                context: AutomationContextAware): GraphClient {
        return !!this.configuration.http.graphClientFactory ?
            this.configuration.http.graphClientFactory(context) :
            this.graphClientFactory.create(
                workspaceId(event),
                this.configuration);
    }

    protected createMessageClient(event: EventIncoming | CommandIncoming,
                                  context: AutomationContextAware): MessageClient {
        return !!this.configuration.http.messageClientFactory ?
            this.configuration.http.messageClientFactory(context) :
            new ExpressMessageClient(event, this.configuration);
    }
}

class ExpressMessageClient implements MessageClient {

    private readonly delegate: MessageClient;

    constructor(private readonly event: EventIncoming | CommandIncoming, configuration: Configuration) {
        if (automationClientInstance().webSocketHandler
            && (automationClientInstance().webSocketHandler as any).webSocketLifecycle) {
            const ws = (automationClientInstance().webSocketHandler as any).webSocketLifecycle as WebSocketLifecycle;
            if (isCommandIncoming(this.event)) {
                this.delegate = new WebSocketCommandMessageClient(this.event, ws, configuration);
            } else if (isEventIncoming(this.event)) {
                this.delegate = new WebSocketEventMessageClient(this.event, ws, configuration);
            }
        }
    }

    public respond(msg: any, options?: MessageOptions): Promise<any> {
        if (this.delegate) {
            return this.delegate.respond(msg, options);
        } else {
            return Promise.resolve();
        }
    }

    public send(msg: any, destinations: Destination | Destination[], options?: MessageOptions): Promise<any> {
        if (this.delegate) {
            return this.delegate.send(msg, destinations, options);
        } else {
            return Promise.resolve();
        }
    }

    public delete(destinations: Destination | Destination[],
                  options: RequiredMessageOptions): Promise<void> {
        if (this.delegate) {
            return this.delegate.delete(destinations, options);
        } else {
            return Promise.resolve();
        }
    }
}
