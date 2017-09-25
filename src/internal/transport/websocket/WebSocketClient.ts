import axios from "axios";
import * as _ from "lodash";
import * as WebSocket from "ws";
import { shutdownHook } from "../../../globals";
import { HandlerResult } from "../../../HandlerResult";
import * as namespace from "../../util/cls";
import { logger } from "../../util/logger";
import { hideString } from "../../util/string";
import { CommandIncoming, EventIncoming, isCommandIncoming, isEventIncoming } from "../TransportEventHandler";
import { sendMessage } from "./WebSocketMessageClient";
import { RegistrationConfirmation, WebSocketTransportEventHandler } from "./WebSocketTransportEventHandler";

export class WebSocketClient {

    constructor(private registrationCallback: () => any,
                private options: WebSocketClientOptions,
                private handler: WebSocketTransportEventHandler) {
        register(this.registrationCallback, options, handler)
            .then(registration =>
                connect(this.registrationCallback, registration, this.options, this.handler));
    }
}

function connect(registrationCallback: () => any, registration: RegistrationConfirmation,
                 options: WebSocketClientOptions, handler: WebSocketTransportEventHandler): Promise<WebSocket> {

    // Functions are inline to avoid "this" peculiarities
    function invokeCommandHandler(chr: CommandIncoming):
        Promise<HandlerResult> {
        return handler.onCommand(chr);
    }

    function invokeEventHandler(e: EventIncoming):
        Promise<HandlerResult[]> {
        return handler.onEvent(e);
    }

    return new Promise<WebSocket>(resolve => {
        logger.info(`Opening WebSocket connection`);
        const ws = new WebSocket(registration.url);

        ws.on("open", function open() {
            handler.onConnection(this);
            resolve(ws);
        });

        ws.on("message", function incoming(data: WebSocket.Data) {
            const request = JSON.parse(data as string);

            // setup context
            const ses = namespace.init();

            ses.run(() => {

                setupNamespace(request, registration);

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
                    invokeCommandHandler(request)
                        .then(() => {
                            logger.debug(`Finished invocation of command handler '%s'`, request.name);
                        }).catch(hr => {
                            logger.warn(`Failed invocation of command handler '%s' with '%s'`, request.name, hr);
                        });
                } else if (isEventIncoming(request)) {
                    invokeEventHandler(request)
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
        });

        // On close this websocket is meant to reconnect
        ws.on("close", function close(code: number, message: string) {
            if (code) {
                logger.warn(`WebSocket connection closed with ${code}: ${message}`);
            } else {
                logger.warn(`WebSocket connection closed`);
            }
            register(registrationCallback, options, handler)
                .then(reg => connect(registrationCallback, reg, options, handler));
        });

        shutdownHook().add(() => {
            logger.info("Closing WebSocket connection");
            ws.close();
            return Promise.resolve(0);
        });
    });
}

function register(registrationCallback: () => any, options: WebSocketClientOptions,
                  handler: WebSocketTransportEventHandler): Promise<RegistrationConfirmation> {
    const registrationPayload = registrationCallback();

    logger.info(`Registering ${registrationPayload.name}@${registrationPayload.version} ` +
        `with Atomist at ${options.registrationUrl}`);
    logger.debug(`\n${JSON.stringify(registrationPayload, null, 2)}`);

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

function setupNamespace(request: any, registration: RegistrationConfirmation) {
    namespace.set({
        correlationId:  _.get(request, "corrid") || _.get(request, "extensions.correlation_id"),
        teamId: _.get(request, "correlation_context.team.id") || _.get(request, "extensions.team_id"),
        operation: _.get(request, "name") || _.get(request, "extensions.operationName"),
        name: registration.name,
        version: registration.version,
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
