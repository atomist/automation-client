import * as exitHook from "async-exit-hook";
import axios from "axios";
import * as promiseRetry from "promise-retry";
import * as WebSocket from "ws";
import { logger } from "../../util/logger";
import { hideString } from "../../util/string";
import { CommandIncoming, EventIncoming, isCommandIncoming, isEventIncoming } from "../RequestProcessor";
import { sendMessage } from "./WebSocketMessageClient";
import { RegistrationConfirmation, WebSocketRequestProcessor } from "./WebSocketRequestProcessor";

export class WebSocketClient {

    public static initialize( registrationCallback: () => any,
                              options: WebSocketClientOptions,
                              requestProcessor: WebSocketRequestProcessor): Promise<WebSocketClient> {
        const wsc = new WebSocketClient(registrationCallback, options, requestProcessor);
        return register(wsc.registrationCallback, options, requestProcessor)
            .then(registration =>
                connect(wsc.registrationCallback, registration, options, requestProcessor)).then(_ => wsc);
    }

    private constructor(private registrationCallback: () => any,
                        private options: WebSocketClientOptions,
                        private requestProcessor: WebSocketRequestProcessor) {}
}

let reconnect = true;

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
        const ws = new WebSocket(registration.url);

        ws.on("open", function open() {
            requestProcessor.onConnection(this);
            resolve(ws);
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
            // Only attempt to reconnect if we aren't shutting down
            if (reconnect) {
                register(registrationCallback, options, requestProcessor)
                    .then(reg => connect(registrationCallback, reg, options, requestProcessor));
            }
        });

        exitHook(() => {
            reconnect = false;
            ws.close();
            logger.info("Closing WebSocket connection");
        });
    });
}

function register(registrationCallback: () => any, options: WebSocketClientOptions,
                  handler: WebSocketRequestProcessor): Promise<RegistrationConfirmation> {
    const registrationPayload = registrationCallback();

    logger.info(`Registering ${registrationPayload.name}@${registrationPayload.version} ` +
        `with Atomist at '${options.registrationUrl}': ${JSON.stringify(registrationPayload)}`);

    const retryOptions = {
        retries: 5,
        factor: 3,
        minTimeout: 1 * 1000,
        maxTimeout: 60 * 1000,
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
                    retry();
                } else if (error.response && error.response.status === 400) {
                    logger.error(`Registration payload for ${nameVersion} was invalid`);
                    process.exit(1);
                } else if (error.response
                    && (error.response.status === 401)) {
                    const furtherInfo = error.response.data ? `\nFurther information: ${error.response.data}` : "";
                    logger.error(
                        `Authorization failed for ${nameVersion} in teams ${registrationPayload.team_ids}` +
                    furtherInfo);
                    process.exit(1);
                } else if (error.response
                    && (error.response.status === 403)) {
                    const furtherInfo = error.response.data ? `\nFurther information: ${error.response.data}` : "";
                    logger.error(
                        `Authentication failed for ${nameVersion} in teams ${registrationPayload.team_ids}.` +
                        furtherInfo);
                    process.exit(1);
                } else {
                    logger.error("Registration failed with '%s'", error);
                    throw error;
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

interface Ping {
    ping: string;
}
