import * as stringify from "json-stringify-safe";
import * as WebSocket from "ws";
import { Configuration } from "../../../configuration";
import { ApolloGraphClientFactory } from "../../../graph/ApolloGraphClientFactory";
import {
    AutomationContextAware,
    HandlerContext,
} from "../../../HandlerContext";
import { AutomationEventListener } from "../../../server/AutomationEventListener";
import { AutomationServer } from "../../../server/AutomationServer";
import { GraphClient } from "../../../spi/graph/GraphClient";
import { MessageClient } from "../../../spi/message/MessageClient";
import {
    HealthStatus,
    registerHealthIndicator,
} from "../../util/health";
import { logger } from "../../util/logger";
import { AbstractRequestProcessor } from "../AbstractRequestProcessor";
import {
    CommandIncoming,
    EventIncoming,
    isCommandIncoming,
    isEventIncoming,
} from "../RequestProcessor";
import {
    sendMessage,
    WebSocketCommandMessageClient,
    WebSocketEventMessageClient,
} from "./WebSocketMessageClient";
import {
    RegistrationConfirmation,
    WebSocketRequestProcessor,
} from "./WebSocketRequestProcessor";

export class DefaultWebSocketRequestProcessor extends AbstractRequestProcessor
    implements WebSocketRequestProcessor {

    private graphClients: ApolloGraphClientFactory;
    private registration?: RegistrationConfirmation;
    private webSocket?: WebSocket;

    constructor(protected automations: AutomationServer,
                protected configuration: Configuration,
                protected listeners: AutomationEventListener[] = []) {
        super(automations, listeners);

        registerHealthIndicator(() => {
            if (this.webSocket && this.registration) {
                return { status: HealthStatus.Up, detail: "WebSocket connection established" };
            } else {
                return { status: HealthStatus.Down, detail: "WebSocket disconnected" };
            }
        });
    }

    public onRegistration(registration: RegistrationConfirmation) {
        logger.info("Registration successful: %s", stringify(registration));
        (this.configuration.ws as any).session = registration;
        this.registration = registration;
        this.graphClients =
            new ApolloGraphClientFactory(this.configuration, () => `Bearer ${registration.jwt}`);
    }

    public onConnect(ws: WebSocket) {
        logger.info("WebSocket connection established. Listening for incoming messages");
        this.webSocket = ws;
        this.listeners.forEach(l => l.registrationSuccessful(this));
    }

    public onDisconnect() {
        this.webSocket = null;
        this.registration = null;
    }

    protected sendStatusMessage(payload: any, ctx: HandlerContext & AutomationContextAware): Promise<any> {
        return Promise.resolve(
            sendMessage(payload, this.webSocket),
        );
    }

    protected createGraphClient(event: CommandIncoming | EventIncoming): GraphClient {
        return this.graphClients.createGraphClient(event);
    }

    protected createMessageClient(event: CommandIncoming | EventIncoming): MessageClient {
        if (isCommandIncoming(event)) {
            return new WebSocketCommandMessageClient(event, this.webSocket);
        } else if (isEventIncoming(event)) {
            return new WebSocketEventMessageClient(event, this.webSocket);
        }
    }
}
