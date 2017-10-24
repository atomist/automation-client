import * as WebSocket from "ws";
import * as global from "../../../globals";
import { ApolloGraphClient } from "../../../graph/ApolloGraphClient";
import { AutomationEventListener } from "../../../server/AutomationEventListener";
import { AutomationServer } from "../../../server/AutomationServer";
import { GraphClient } from "../../../spi/graph/GraphClient";
import { MessageClient } from "../../../spi/message/MessageClient";
import { HealthStatus, registerHealthIndicator } from "../../util/health";
import { logger } from "../../util/logger";
import { obfuscateJson } from "../../util/string";
import { AbstractEventStoringRequestProcessor } from "../AbstractEventStoringRequestProcessor";
import {
    CommandIncoming,
    EventIncoming,
    isCommandIncoming,
    isEventIncoming,
} from "../RequestProcessor";
import { WebSocketClientOptions } from "./WebSocketClient";
import {
    sendMessage,
    WebSocketCommandMessageClient,
    WebSocketEventMessageClient,
} from "./WebSocketMessageClient";
import {
    RegistrationConfirmation,
    WebSocketRequestProcessor,
} from "./WebSocketRequestProcessor";

export class DefaultWebSocketRequestProcessor extends AbstractEventStoringRequestProcessor
    implements WebSocketRequestProcessor {

    private registration?: RegistrationConfirmation;
    private webSocket?: WebSocket;
    private graphClients: Map<string, GraphClient> = new Map<string, GraphClient>();

    constructor(protected automations: AutomationServer, private options: WebSocketClientOptions,
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
        logger.info("Registration successful: %s", JSON.stringify(registration, obfuscateJson));
        global.setJwtToken(registration.jwt);
        this.registration = registration;
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

    protected sendMessage(payload: any) {
        sendMessage(payload, this.webSocket);
    }

    protected createGraphClient(event: CommandIncoming | EventIncoming): GraphClient {
        let teamId;
        if (isCommandIncoming(event)) {
            teamId = event.team.id;
        } else if (isEventIncoming(event)) {
            teamId = event.extensions.team_id;
        }

        if (this.graphClients.has(teamId)) {
            return this.graphClients.get(teamId);
        } else if (this.registration) {
            const graphClient = new ApolloGraphClient(`${this.options.graphUrl}/${teamId}`,
                { Authorization: `Bearer ${this.registration.jwt}` });

            return graphClient;
        }
        return null;
    }

    protected doCreateMessageClient(event: CommandIncoming | EventIncoming): MessageClient {
        if (isCommandIncoming(event)) {
            return new WebSocketCommandMessageClient(event, this.automations, this.webSocket);
        } else if (isEventIncoming(event)) {
            return new WebSocketEventMessageClient(event, this.automations, this.webSocket);
        }
    }
}
