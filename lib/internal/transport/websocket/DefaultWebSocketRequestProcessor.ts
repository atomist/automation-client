import * as stringify from "json-stringify-safe";
import * as WebSocket from "ws";
import { Configuration } from "../../../configuration";
import {
    AutomationContextAware,
    HandlerContext,
} from "../../../HandlerContext";
import { AutomationEventListener } from "../../../server/AutomationEventListener";
import { AutomationServer } from "../../../server/AutomationServer";
import { GraphClient } from "../../../spi/graph/GraphClient";
import { GraphClientFactory } from "../../../spi/graph/GraphClientFactory";
import { MessageClient } from "../../../spi/message/MessageClient";
import { logger } from "../../../util/logger";
import {
    HealthStatus,
    registerHealthIndicator,
} from "../../util/health";
import { AbstractRequestProcessor } from "../AbstractRequestProcessor";
import {
    CommandIncoming,
    EventIncoming,
    isCommandIncoming,
    isEventIncoming,
    workspaceId,
} from "../RequestProcessor";
import { WebSocketLifecycle } from "./WebSocketLifecycle";
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

    private graphClients: GraphClientFactory;
    private registration?: RegistrationConfirmation;
    private webSocketLifecycle: WebSocketLifecycle;

    constructor(protected automations: AutomationServer,
                protected configuration: Configuration,
                protected listeners: AutomationEventListener[] = []) {
        super(automations, listeners);
        this.webSocketLifecycle = (configuration.ws as any).lifecycle as WebSocketLifecycle;

        registerHealthIndicator(() => {
            if (this.webSocketLifecycle.connected() && this.registration) {
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
        this.graphClients = this.configuration.graphql.client.factory;
    }

    public onConnect(ws: WebSocket) {
        logger.info("WebSocket connection established. Listening for incoming messages");
        this.webSocketLifecycle.set(ws);
        this.listeners.forEach(l => l.registrationSuccessful(this));
    }

    public onDisconnect() {
        this.webSocketLifecycle.reset();
        this.registration = null;
    }

    protected sendStatusMessage(payload: any, ctx: HandlerContext & AutomationContextAware): Promise<any> {
        return Promise.resolve(
            this.webSocketLifecycle.send(payload),
        );
    }

    protected createGraphClient(event: CommandIncoming | EventIncoming): GraphClient {
        return this.graphClients.create(
            workspaceId(event),
            this.configuration);
    }

    protected createMessageClient(event: CommandIncoming | EventIncoming): MessageClient {
        if (isCommandIncoming(event)) {
            return new WebSocketCommandMessageClient(event, this.webSocketLifecycle, this.configuration);
        } else if (isEventIncoming(event)) {
            return new WebSocketEventMessageClient(event, this.webSocketLifecycle, this.configuration);
        }
    }
}
