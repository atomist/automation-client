import * as WebSocket from "ws";
import { RequestProcessor } from "../RequestProcessor";

export interface WebSocketRequestProcessor extends RequestProcessor {

    onRegistration(registration: RegistrationConfirmation);

    onConnection(ws: WebSocket);
}

export interface RegistrationConfirmation {

    url: string;
    jwt: string;
    name: string;
    version: string;
}
