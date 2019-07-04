import * as stringify from "json-stringify-safe";
import promiseRetry = require("promise-retry");
import * as serializeError from "serialize-error";
import * as WebSocket from "ws";
import * as zlib from "zlib";
import { Configuration } from "../../../configuration";
import { HttpMethod } from "../../../spi/http/httpClient";
import { logger } from "../../../util/logger";
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

    public constructor(
        private readonly registrationCallback: () => any,
        private readonly configuration: Configuration,
        private readonly requestProcessor: WebSocketRequestProcessor,
    ) {
    }

    public start(): Promise<void> {

        const connection = register(this.registrationCallback, this.configuration, this.requestProcessor, 5)
            .then(registration =>
                connect(this.registrationCallback, registration, this.configuration, this.requestProcessor));
        return connection.then(() => {

            registerShutdownHook(() => {
                reconnect = false;
                logger.info("Closing WebSocket connection");
                ws.close();
                return Promise.resolve(0);
            }, 100000, "closing websocket");

        }).catch(() => {
            logger.error("Persistent error registering with Atomist, exiting");
            process.exit(1);
        });
    }
}

let reconnect = true;
let ping = 0;
let pong;
let ws;

function connect(registrationCallback: () => any,
                 registration: RegistrationConfirmation,
                 configuration: Configuration,
                 requestProcessor: WebSocketRequestProcessor): Promise<WebSocket> {

    // Functions are inline to avoid "this" peculiarities
    function invokeCommandHandler(chr: CommandIncoming): void {
        requestProcessor.processCommand(chr);
    }

    function invokeEventHandler(e: EventIncoming): void {
        requestProcessor.processEvent(e);
    }

    return new Promise<WebSocket>(resolve => {

        logger.info(`Opening WebSocket connection`);
        ws = configuration.ws.client.factory.create(registration);

        let timer: NodeJS.Timer;

        ws.on("open", function open(): void {
            // tslint:disable-next-line:no-invalid-this
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

        ws.on("message", function incoming(data: WebSocket.Data): void {

            function handleMessage(reqString: string): void {
                let request: any;
                try {
                    request = JSON.parse(reqString);
                } catch (err) {
                    logger.error(`Failed to parse incoming message: %s`, reqString);
                    return;
                }

                try {
                    if (isPing(request)) {
                        sendMessage({ pong: request.ping }, ws, false);
                    } else if (isPong(request)) {
                        pong = request.pong;
                    } else if (isControl(request)) {
                        logger.info("WebSocket connection stopped listening for incoming messages");
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
                    logger.error("Failed processing of message payload with: %s", JSON.stringify(serializeError(err)));
                }
            }

            if (configuration.ws.compress) {
                zlib.gunzip(data as Buffer, (err, result) => {
                    if (!err) {
                        handleMessage(result.toString());
                    } else {
                        logger.warn(`Failed to decompress incoming message: %s`, data);
                        handleMessage(data as string);
                    }
                });
            } else {
                handleMessage(data as string);
            }
        });

        // On close this websocket is meant to reconnect
        ws.on("close", (code: number, message: string) => {
            if (code) {
                logger.warn(`WebSocket connection closed with ${code}: ${message}`);
            } else {
                logger.warn(`WebSocket connection closed`);
            }
            reset();
            // Only attempt to reconnect if we aren't shutting down
            if (reconnect) {
                register(registrationCallback, configuration, requestProcessor)
                    .then(reg => connect(registrationCallback, reg, configuration, requestProcessor));
            }
        });

        ws.on("error", err => {
            if (err) {
                logger.warn(`WebSocket error occurred: ${JSON.stringify(serializeError(err))}`);
            }
        });

        function reset(): void {
            requestProcessor.onDisconnect();
            clearInterval(timer);
            ping = 0;
            pong = 0;
        }
    });
}

function register(registrationCallback: () => any,
                  configuration: Configuration,
                  handler: WebSocketRequestProcessor,
                  retries: number = 100): Promise<RegistrationConfirmation> {
    const registrationPayload = registrationCallback();

    logger.debug(`Registering ${registrationPayload.name}:${registrationPayload.version} ` +
        `with Atomist at '${configuration.endpoints.api}': ${stringify(registrationPayload)}`);

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

        const client = configuration.http.client.factory.create(configuration.endpoints.api);

        const authorization = `Bearer ${configuration.apiKey}`;

        return client.exchange<RegistrationConfirmation>(configuration.endpoints.api, {
            body: registrationPayload,
            method: HttpMethod.Post,
            headers: { Authorization: authorization },
            options: {
                timeout: configuration.ws.timeout,
            },
            retry: { retries: 0, log: false },
        })
            .then(result => {
                const registration = result.body;

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
                } else if (error.response && (error.response.status === 400
                    || error.response.status === 401
                    || error.response.status === 403
                    || error.response.status === 500)) {
                    logger.error(`Registration failed with code '%s': '%s'`,
                        error.response.status, JSON.stringify(error.response.data));
                    process.exit(1);
                } else {
                    logger.error("Registration failed with '%s'", error);
                    retry(error);
                }
            }) as Promise<RegistrationConfirmation>;
    });
}

/* tslint:disable:no-null-keyword */
function isPing(a: any): a is Ping {
    return a.ping !== null && a.ping !== undefined;
}

function isPong(a: any): a is Pong {
    return a.pong !== null && a.pong !== undefined;
}

function isControl(a: any): a is Control {
    return a.control !== null && a.control !== undefined;
}
/* tslint:enable:no-null-keyword */

interface Ping {
    ping: string;
}

interface Pong {
    pong: string;
}

interface Control {
    control: {
        name: string;
    };
}
