import * as WebSocket from "ws";
import { TransportEventHandler } from "../TransportEventHandler";

export interface WebSocketTransportEventHandler extends TransportEventHandler {

    onRegistration(registration: RegistrationIncoming);

    onConnection(ws: WebSocket);
}

export interface RegistrationIncoming {

    url: string;
    jwt: string;
}
