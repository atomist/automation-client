import * as WebSocket from "ws";
import { HandlerResult } from "../../../HandlerResult";
import { AutomationEventListener } from "../AutomationEventListener";

export interface WebSocketAutomationEventListener extends AutomationEventListener {

    onRegistration(registration: RegistrationIncoming);

    onConnection(ws: WebSocket);
}

export interface RegistrationIncoming {

    url: string;
    jwt: string;
}
