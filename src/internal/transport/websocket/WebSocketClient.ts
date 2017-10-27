import axios from "axios";
import * as promiseRetry from "promise-retry";
import * as WebSocket from "ws";
import { logger } from "../../util/logger";
import Timer = NodeJS.Timer;
import { registerShutdownHook } from "../../util/shutdown";
import {
    CommandIncoming,
    EventIncoming,
    isCommandIncoming,
    isEventIncoming,
} from "../RequestProcessor";
import { sendMessage } from "./WebSocketMessageClient";
import {
    RegistrationConfirmation,
    WebSocketRequestProcessor,
} from "./WebSocketRequestProcessor";

export class WebSocketClient {

    public constructor(private registrationCallback: () => any,
                       private options: WebSocketClientOptions,
                       private requestProcessor: WebSocketRequestProcessor) {
    }

    public start(): Promise<void> {

        const connection = register(this.registrationCallback, this.options, this.requestProcessor, 5)
            .then(registration =>
                connect(this.registrationCallback, registration, this.options, this.requestProcessor));
        return connection.then(() => {

                registerShutdownHook(() => {
                    reconnect = false;
                    ws.close();
                    logger.info("Closing WebSocket connection");
                    return Promise.resolve(0);
                });

            }).catch(() => {
                logger.error("Persistent error registering with Atomist. Exiting");
                process.exit(1);
            });
    }
}

let reconnect = true;
let ping = 0;
let pong;
let ws;

function connect(registrationCallback: () => any, registration: RegistrationConfirmation,
                 options: WebSocketClientOptions, requestProcessor: WebSocketRequestProcessor): Promise<WebSocket> {

    // Functions are inline to avoid "this" peculiarities
    function invokeCommandHandler(chr: CommandIncoming) {
        requestProcessor.processCommand(chr);
    }

    function invokeEventHandler(e: EventIncoming) {
        requestProcessor.processEvent(e);
    }

    return new Promise<WebSocket>(resolve => {
        logger.info(`Opening WebSocket connection`);
        ws = new WebSocket(registration.url);
        let timer: Timer;

        ws.on("open", function open() {
            requestProcessor.onConnect(this);
            resolve(ws);

            // Install ping/pong timer and shutdown hooks
            timer = setInterval(() => {
                if (pong + 1 < ping) {
                    reset();
                    ws.terminate();
                    logger.error("Missing ping/pong from the server. Closing WebSocket");
                } else {
                    sendMessage({ ping }, ws, false);
                    ping++;
                }
            }, 10000);
        });

        ws.on("message", function incoming(data: WebSocket.Data) {
            let request;
            try {
                request = JSON.parse(data as string);
            } catch (err) {
                logger.error(`Failed to parse incoming message: %s`, data);
                return;
            }
            try {
                if (isPing(request)) {
                    sendMessage({ pong: request.ping }, this, false);
                } else if (isPong(request)) {
                    pong = request.pong;
                } else {
                    if (isCommandIncoming(request)) {
                        invokeCommandHandler(request);
                    } else if (isEventIncoming(request)) {
                        invokeEventHandler(request);
                    } else {
                        logger.error(`Unknown message payload received: ${data}`);
                    }
                }
            } catch (err) {
                console.error("Failed processing of message payload wth: %s", err);
            }
        });

        // On close this websocket is meant to reconnect
        ws.on("close", function close(code: number, message: string) {
            if (code) {
                logger.warn(`WebSocket connection closed with ${code}: ${message}`);
            } else {
                logger.warn(`WebSocket connection closed`);
            }
            reset();
            // Only attempt to reconnect if we aren't shutting down
            if (reconnect) {
                register(registrationCallback, options, requestProcessor)
                    .then(reg => connect(registrationCallback, reg, options, requestProcessor));
            }
        });

        function reset() {
            requestProcessor.onDisconnect();
            clearInterval(timer);
            ping = 0;
            pong = 0;
        }
    });
}

function register(registrationCallback: () => any, options: WebSocketClientOptions,
                  handler: WebSocketRequestProcessor, retries: number = 100): Promise<RegistrationConfirmation> {
    const registrationPayload = registrationCallback();

    logger.info(`Registering ${registrationPayload.name}@${registrationPayload.version} ` +
        `with Atomist at '${options.registrationUrl}': ${JSON.stringify(registrationPayload)}`);

    const retryOptions = {
        retries,
        factor: 3,
        minTimeout: 1 * 500,
        maxTimeout: 5 * 1000,
        randomize: true,
    };

    return promiseRetry(retryOptions, (retry, retryCount) => {

        if (retryCount > 1) {
            logger.warn("Retrying registration due to previous error");
        }

        return axios.post(options.registrationUrl, registrationPayload,
            { headers: { Authorization: `token ${options.token}` } })
            .then(result => {
                const registration = result.data as RegistrationConfirmation;

                registration.name = registrationPayload.name;
                registration.version = registrationPayload.version;

                handler.onRegistration(registration);
                return registration;
            })
            .catch(error => {
                const nameVersion = `${registrationPayload.name}@${registrationPayload.version}`;
                if (error.response && error.response.status === 409) {
                    logger.error(`Registration failed because a session for ${nameVersion} is already active`);
                    retry(error);
                } else if (error.response && error.response.status === 400) {
                    logger.error(`Registration payload for ${nameVersion} was invalid`);
                    process.exit(1);
                } else if (error.response
                    && (error.response.status === 401)) {
                    const furtherInfo = error.response.data ? `\nFurther information: ${error.response.data}` : "";
                    logger.error(
                        `Authentication failed for ${nameVersion} in teams ${registrationPayload.team_ids}` +
                        furtherInfo);
                    process.exit(1);
                } else if (error.response
                    && (error.response.status === 403)) {
                    const furtherInfo = error.response.data ? `\nFurther information: ${error.response.data}` : "";
                    logger.error(
                        `Authorization failed for ${nameVersion} in teams ${registrationPayload.team_ids}.
This could be caused by:
- The Atomist app has not been authorized in the Slack team
- You are not a member of each GitHub organization associated with the Slack team
- Your GitHub token doesn't provide org:read permissions` +
                        furtherInfo);
                    process.exit(1);
                } else {
                    logger.error("Registration failed with '%s'", error);
                    retry(error);
                }
            });
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

function isPong(a: any): a is Pong {
    return a.pong != null;
}

interface Ping {
    ping: string;
}

interface Pong {
    pong: string;
}
