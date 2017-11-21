import { SlackMessage } from "@atomist/slack-messages/SlackMessages";
import * as cluster from "cluster";
import * as stringify from "json-stringify-safe";
import * as serializeError from "serialize-error";
import * as WebSocket from "ws";
import * as global from "../../../globals";
import { EventFired } from "../../../HandleEvent";
import { HandlerContext } from "../../../HandlerContext";
import { HandlerResult } from "../../../HandlerResult";
import { AutomationEventListener } from "../../../server/AutomationEventListener";
import { AutomationServer } from "../../../server/AutomationServer";
import { GraphClient } from "../../../spi/graph/GraphClient";
import { MessageClient } from "../../../spi/message/MessageClient";
import { CommandInvocation } from "../../invoker/Payload";
import * as namespace from "../../util/cls";
import { Deferred } from "../../util/Deferred";
import {
    HealthStatus,
    registerHealthIndicator,
} from "../../util/health";
import { logger } from "../../util/logger";
import {
    AbstractRequestProcessor,
    clearNamespace,
} from "../AbstractRequestProcessor";
import {
    CommandIncoming,
    EventIncoming,
    isCommandIncoming,
    isEventIncoming,
} from "../RequestProcessor";
import { WebSocketClientOptions } from "../websocket/WebSocketClient";
import {
    sendMessage,
    WebSocketCommandMessageClient,
    WebSocketEventMessageClient,
} from "../websocket/WebSocketMessageClient";
import {
    RegistrationConfirmation,
    WebSocketRequestProcessor,
} from "../websocket/WebSocketRequestProcessor";
import { broadcast, MasterMessage, WorkerMessage } from "./messages";

/**
 * A RequestProcessor that delegates to Node.JS Cluster workers to do the actual
 * command and event processing.
 * @see ClusterWorkerRequestProcessor
 */
export class ClusterMasterRequestProcessor extends AbstractRequestProcessor
    implements WebSocketRequestProcessor {

    private registration?: RegistrationConfirmation;
    private webSocket?: WebSocket;
    private commands: Map<string, Dispatched<HandlerResult>> = new Map();
    private events: Map<string, Dispatched<HandlerResult[]>> = new Map();

    constructor(protected automations: AutomationServer,
                protected options: WebSocketClientOptions,
                protected listeners: AutomationEventListener[] = [],
                protected numWorkers: number = require("os").cpus().length) {
        super(automations, listeners);

        registerHealthIndicator(() => {
            if (this.webSocket && this.registration) {
                return { status: HealthStatus.Up, detail: "WebSocket connection established" };
            } else {
                return { status: HealthStatus.Down, detail: "WebSocket disconnected" };
            }
        });
    }

    public onRegistration(registration: RegistrationConfirmation) {
        logger.info("Registration successful: %s", stringify(registration));
        global.setJwtToken(registration.jwt);
        this.registration = registration;

        broadcast({
            type: "registration",
            registration: this.registration,
        });
    }

    public onConnect(ws: WebSocket) {
        logger.info("WebSocket connection established. Listening for incoming messages");
        this.webSocket = ws;
        this.listeners.forEach(l => l.registrationSuccessful(this));
    }

    public onDisconnect() {
        this.webSocket = null;
        this.registration = null;
    }

    public run(): Promise<any> {
        const ws = () => this.webSocket;
        const listeners = this.listeners;
        const commands = this.commands;
        const events = this.events;

        function attachEvents(worker: cluster.Worker, deferred: Deferred<any>) {

            worker.on("message", message => {
                const msg = message as WorkerMessage;

                // Wait for online message to come in
                if (msg.type === "online") {
                    deferred.resolve();
                    return;
                }

                const ses = namespace.init();
                ses.run(() => {
                    namespace.set(msg.cls);

                    logger.debug("Received incoming message from worker '%s': %j", worker.id, msg);

                    const invocationId = namespace.get().invocationId;
                    if (msg.type === "message") {

                        let messageClient: MessageClient;
                        if (commands.has(invocationId)) {
                            messageClient = commands.get(invocationId).context.messageClient;
                        } else if (events.has(invocationId)) {
                            messageClient = events.get(invocationId).context.messageClient;
                        } else {
                            logger.warn("Can't handle message from worker due to missing messageClient");
                            clearNamespace();
                            return;
                        }

                        if (msg.data.userNames && msg.data.userNames.length > 0) {
                            messageClient.addressUsers(msg.data.message as string | SlackMessage,
                                msg.data.userNames, msg.data.options)
                                .then(clearNamespace, clearNamespace);
                        } else if (msg.data.channelNames && msg.data.channelNames.length > 0) {
                            messageClient.addressChannels(msg.data.message as string | SlackMessage,
                                msg.data.channelNames, msg.data.options)
                                .then(clearNamespace, clearNamespace);
                        } else {
                            messageClient.respond(msg.data.message as string | SlackMessage, msg.data.options)
                                .then(clearNamespace, clearNamespace);
                        }
                        return;
                    }

                    try {
                        if (msg.type === "status") {
                            sendMessage(msg.data, ws());
                        } else if (msg.type === "command_success") {
                            listeners.forEach(l => l.commandSuccessful(msg.event as CommandInvocation,
                                null, msg.data as HandlerResult));
                            if (commands.has(invocationId)) {
                                commands.get(invocationId).result.resolve(msg.data as HandlerResult);
                                commands.delete(invocationId);
                            }
                        } else if (msg.type === "command_failure") {
                            listeners.forEach(l => l.commandFailed(msg.event as CommandInvocation,
                                null, msg.data));
                            if (commands.has(invocationId)) {
                                commands.get(invocationId).result.resolve(msg.data as HandlerResult);
                                commands.delete(invocationId);
                            }
                        } else if (msg.type === "event_success") {
                            listeners.forEach(l => l.eventSuccessful(msg.event as EventFired<any>,
                                null, msg.data as HandlerResult[]));
                            if (events.has(invocationId)) {
                                events.get(invocationId).result.resolve(msg.data as HandlerResult[]);
                                events.delete(invocationId);
                            }
                        } else if (msg.type === "event_failure") {
                            listeners.forEach(l => l.eventFailed(msg.event as EventFired<any>,
                                null, msg.data));
                            if (events.has(invocationId)) {
                                events.get(invocationId).result.resolve(msg.data as HandlerResult[]);
                                events.delete(invocationId);
                            }
                        }
                    } catch (err) {
                        logger.error("Error occurred handling worker message: %s", serializeError(err));
                    } finally {
                        clearNamespace();
                    }
                });
            });
        }

        const promises: Array<Promise<any>> = [];

        for (let i = 0; i < this.numWorkers; i++) {
            const worker = cluster.fork();

            const deferred = new Deferred<any>();
            promises.push(deferred.promise);

            attachEvents(worker, deferred);
        }

        cluster.on("disconnect", worker => {
            logger.warn(`Worker '${worker.id}' disconnected. Killing ...`);
            worker.kill("SIGTERM");
        });

        cluster.on("exit", (worker, code, signal) => {
            logger.warn(`Worker '${worker.id}' exited with '${code}' '${signal}'. Restarting ...`);
            attachEvents(cluster.fork(), new Deferred());
        });

        return Promise.all(promises);
    }

    protected invokeCommand(ci: CommandInvocation,
                            ctx: HandlerContext,
                            command: CommandIncoming,
                            callback: (result: Promise<HandlerResult>) => void) {
        const message: MasterMessage = {
            type: "command",
            registration: this.registration,
            cls: {
                ...namespace.get(),
            },
            data: command,
        };

        const dispatched = new Dispatched(new Deferred<HandlerResult>(), ctx);
        this.commands.set(namespace.get().invocationId, dispatched);
        const worker = this.assignWorker();
        logger.debug("Incoming command '%s' dispatching to worker '%s'", ci.name, worker.id);
        worker.send(message);
        callback(dispatched.result.promise);
    }

    protected invokeEvent(ef: EventFired<any>,
                          ctx: HandlerContext,
                          event: EventIncoming,
                          callback: (results: Promise<HandlerResult[]>) => void) {
        const message: MasterMessage = {
            type: "event",
            registration: this.registration,
            cls: {
                ...namespace.get(),
            },
            data: event,
        };

        const dispatched = new Dispatched(new Deferred<HandlerResult[]>(), ctx);
        this.events.set(namespace.get().invocationId, dispatched);
        const worker = this.assignWorker();
        logger.debug("Incoming event '%s' dispatching to worker '%s'", ef.extensions.operationName, worker.id);
        worker.send(message);
        callback(dispatched.result.promise);
    }

    protected sendMessage(payload: any) {
        sendMessage(payload, this.webSocket);
    }

    protected createGraphClient(event: CommandIncoming | EventIncoming): GraphClient {
        return null;
    }

    protected createMessageClient(event: CommandIncoming | EventIncoming): MessageClient {
        if (isCommandIncoming(event)) {
            return new WebSocketCommandMessageClient(event, this.automations, this.webSocket);
        } else if (isEventIncoming(event)) {
            return new WebSocketEventMessageClient(event, this.automations, this.webSocket);
        }
    }

    private assignWorker(): cluster.Worker {
        const workers = [];
        for (const id in cluster.workers) {
            if (cluster.workers.hasOwnProperty(id)) {
                const worker = cluster.workers[id];
                if (worker.isConnected()) {
                    workers.push(worker);
                }
            }
        }
        return workers[Math.floor(Math.random() * workers.length)];
    }
}

class Dispatched<T> {

    constructor(public result: Deferred<T>, public context: HandlerContext) {}
}
