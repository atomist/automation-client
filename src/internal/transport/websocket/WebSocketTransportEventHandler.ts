import * as WebSocket from "ws";
import { TransportEventHandler } from "../TransportEventHandler";

export interface WebSocketTransportEventHandler extends TransportEventHandler {

    onRegistration(registration: RegistrationConfirmation);

    onConnection(ws: WebSocket);
}

export interface RegistrationConfirmation {

    url: string;
    jwt: string;
    name: string;
    version: string;
}
