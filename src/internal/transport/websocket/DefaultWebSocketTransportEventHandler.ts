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
    private graphClient: GraphClient;

    constructor(protected automations: AutomationServer, private options: WebSocketClientOptions,
                protected listeners: AutomationEventListener[] = []) {
        super(automations, listeners);
    }

    public onRegistration(registration: RegistrationConfirmation) {
        logger.info(`Registration successful`);
        logger.debug(`\n${JSON.stringify(registration, null, 2)}`);

        setJwtToken(registration.jwt);
        this.registration = registration;
        this.graphClient = new ApolloGraphClient(this.options.graphUrl,
            { Authorization: `Bearer ${this.registration.jwt}`});
    }

    public onConnection(ws: WebSocket) {
        logger.info("WebSocket connection established");
        logger.info("Listening for incoming events");
        this.webSocket = ws;
    }

    protected sendMessage(payload: any) {
        sendMessage(payload, this.webSocket);
    }

    protected createGraphClient(event: CommandIncoming | EventIncoming): GraphClient {
        return this.graphClient;
    }

    protected doCreateMessageClient(event: CommandIncoming | EventIncoming): MessageClient {
        if (isCommandIncoming(event)) {
            return new WebSocketCommandMessageClient(event, this.automations, this.webSocket);
        } else if (isEventIncoming(event)) {
            return new WebSocketEventMessageClient(event, this.automations, this.webSocket);
        }
    }
}
