import * as WebSocket from "ws";
import { setJwtToken } from "../../../globals";
import { ApolloGraphClient } from "../../../graph/ApolloGraphClient";
import { AutomationEventListener } from "../../../server/AutomationEventListener";
import { AutomationServer } from "../../../server/AutomationServer";
import { GraphClient } from "../../../spi/graph/GraphClient";
import { MessageClient } from "../../../spi/message/MessageClient";
import { logger } from "../../util/logger";
import { AbstractEventStoringTransportEventHandler } from "../AbstractEventStoringTransportEventHandler";
import { CommandIncoming, EventIncoming, isCommandIncoming, isEventIncoming } from "../TransportEventHandler";
import { WebSocketClientOptions } from "./WebSocketClient";
import {
    sendMessage,
    WebSocketCommandMessageClient,
    WebSocketEventMessageClient,
} from "./WebSocketMessageClient";
import { RegistrationConfirmation, WebSocketTransportEventHandler } from "./WebSocketTransportEventHandler";

export class DefaultWebSocketTransportEventHandler extends AbstractEventStoringTransportEventHandler
    implements WebSocketTransportEventHandler {

    private registration: RegistrationConfirmation;
    private webSocket: WebSocket;
    private graphClients: Map<string, GraphClient> = new Map<string, GraphClient>();

    constructor(protected automations: AutomationServer, private options: WebSocketClientOptions,
                protected listeners: AutomationEventListener[] = []) {
        super(automations, listeners);
    }

    public onRegistration(registration: RegistrationConfirmation) {
        logger.info("Registration successful: %s", JSON.stringify(registration));

        setJwtToken(registration.jwt);
        this.registration = registration;
    }

    public onConnection(ws: WebSocket) {
        logger.info("WebSocket connection established. Listening for incoming messages");
        this.webSocket = ws;
        this.listeners.forEach(l => l.registrationSuccessful(this));
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
        } else {
            const graphClient = new ApolloGraphClient(`${this.options.graphUrl}/${teamId}`,
                { Authorization: `Bearer ${this.registration.jwt}`});

            return graphClient;
        }
    }

    protected doCreateMessageClient(event: CommandIncoming | EventIncoming): MessageClient {
        if (isCommandIncoming(event)) {
            return new WebSocketCommandMessageClient(event, this.automations, this.webSocket);
        } else if (isEventIncoming(event)) {
            return new WebSocketEventMessageClient(event, this.automations, this.webSocket);
        }
    }
}
