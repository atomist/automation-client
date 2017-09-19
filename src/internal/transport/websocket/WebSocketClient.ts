import axios from "axios";
import * as WebSocket from "ws";
import { HandlerResult } from "../../../HandlerResult";
import { logger } from "../../util/logger";
import { hideString } from "../../util/string";
import { CommandIncoming, EventIncoming, isCommandIncoming, isEventIncoming } from "../AutomationEventListener";
import { RegistrationIncoming, WebSocketAutomationEventListener } from "./WebSocketAutomationEventListener";
import { sendMessage } from "./WebSocketMessageClient";

export class WebSocketClient {

    constructor(private registrationCallback: () => any,
                private options: WebSocketClientOptions,
                private listeners: WebSocketAutomationEventListener[] = []) {
        register(this.registrationCallback, options, listeners)
            .then(registration =>
                connect(this.registrationCallback, registration, this.options, this.listeners));
    }
}

function connect(registrationCallback: () => any, registration: RegistrationIncoming,
                 options: WebSocketClientOptions, listeners: WebSocketAutomationEventListener[]): Promise<WebSocket> {

    // Functions are inline to avoid "this" peculiarities
    function invokeCommandHandler(chr: CommandIncoming):
        Promise<HandlerResult[]> {
        return Promise.all(listeners.map(l => l.onCommand(chr)));
    }

    function invokeEventHandler(e: EventIncoming):
        Promise<HandlerResult[][]> {
        return Promise.all(listeners.map(l => l.onEvent(e)));
    }

    return new Promise<WebSocket>(resolve => {
        logger.info(`Opening WebSocket`);
        const ws = new WebSocket(registration.url);

        ws.on("open", function open() {
            listeners.forEach(l => l.onConnection(this));
            resolve(ws);
        });

        ws.on("message", function incoming(data: WebSocket.Data) {
            const request = JSON.parse(data as string);
            logger.debug("Incoming message\n%s", JSON.stringify(request, function replacer(key, value) {
                if (key === "secrets") {
                    return value.map(v => ({ name: v.name, value: hideString(v.value) }));
                } else {
                    return value;
                }
            }, 2));

            if (isPing(request)) {
                logger.debug("Received ping message");
                sendMessage({ pong: request.ping }, this);
            } else if (isCommandIncoming(request)) {
                return invokeCommandHandler(request)
                    .then(() => {
                        logger.debug(`Finished invocation of command handler '%s'`, request.name);
                    }).catch(hr => {
                        logger.warn(`Failed invocation of command handler '%s' with '%s'`, request.name, hr);
                    });
            } else if (isEventIncoming(request)) {
                return invokeEventHandler(request)
                    .then(() => {
                        logger.debug(`Finished invocation of event handler '%s'`, request.extensions.operationName);
                    }).catch(er => {
                        logger.warn(`Failed invocation of command handler '%s' with '%s'`,
                            request.extensions.operationName, er);
                    });
            } else {
                throw new Error(`Don't know how to handle '${data}'`);
            }
        });

        // On close this websocket is meant to reconnect
        ws.on("close", function close(code: number, message: string) {
            if (code) {
                logger.warn(`WebSocket connection closed with ${code}: ${message}`);
            } else {
                logger.warn(`WebSocket connection closed`);
            }
            register(registrationCallback, options, listeners)
                .then(reg => connect(registrationCallback, reg, options, listeners));
        });

    });
}

function register(registrationCallback: () => any, options: WebSocketClientOptions,
                  listeners: WebSocketAutomationEventListener[]): Promise<RegistrationIncoming> {
    const registrationPayload = registrationCallback();

    logger.info(`Registering ${registrationPayload.name}@${registrationPayload.version} ` +
        `with Atomist at ${options.registrationUrl}`);
    logger.debug(`\n${JSON.stringify(registrationPayload, null, 2)}`);

    return axios.post(options.registrationUrl, registrationPayload,
        { headers: { Authorization: `token ${options.token}` } })
        .then(result => {
            const registration = result.data as RegistrationIncoming;
            listeners.forEach(l => l.onRegistration(registration));
            return registration;
        })
        .catch(error => {
            if (error.response && error.response.status === 409) {
                logger.error(`Registration failed because a session for ${registrationPayload.name}` +
                    `@${registrationPayload.version} is already active`);
                process.exit(1);
            } else if (error.response && error.response.status === 400) {
                logger.error(`Registration payload for for ${registrationPayload.name}` +
                    `@${registrationPayload.version} was invalid`);
                process.exit(1);
            } else {
                logger.error("Registration failed with '%s'", error);
            }
            process.exit(1);
            throw error;
        });
}

export interface WebSocketClientOptions {
    registrationUrl: string;
    graphUrl: string;
    token: string;
}

function isPing(a: any): a is Ping {
    return a.ping != null;
}

interface Ping {
    ping: string;
}
