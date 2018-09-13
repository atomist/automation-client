import * as cluster from "cluster";
import * as stringify from "json-stringify-safe";
import * as WebSocket from "ws";
import { Configuration } from "../../../configuration";
import * as global from "../../../globals";
import { EventFired } from "../../../HandleEvent";
import {
    AutomationContextAware,
    HandlerContext,
} from "../../../HandlerContext";
import { HandlerResult } from "../../../HandlerResult";
import { AutomationEventListener } from "../../../server/AutomationEventListener";
import { AutomationServer } from "../../../server/AutomationServer";
import { GraphClient } from "../../../spi/graph/GraphClient";
import { MessageClient } from "../../../spi/message/MessageClient";
import { logger } from "../../../util/logger";
import { CommandInvocation } from "../../invoker/Payload";
import * as namespace from "../../util/cls";
import { Deferred } from "../../util/Deferred";
import {
    HealthStatus,
    registerHealthIndicator,
} from "../../util/health";
import { registerShutdownHook } from "../../util/shutdown";
import { AbstractRequestProcessor } from "../AbstractRequestProcessor";
import {
    CommandIncoming,
    EventIncoming,
    isCommandIncoming,
    isEventIncoming,
} from "../RequestProcessor";
import { showStartupMessages } from "../showStartupMessages";
import {
    sendMessage,
    WebSocketCommandMessageClient,
    WebSocketEventMessageClient,
} from "../websocket/WebSocketMessageClient";
import {
    RegistrationConfirmation,
    WebSocketRequestProcessor,
} from "../websocket/WebSocketRequestProcessor";
import {
    broadcast,
    MasterMessage,
    WorkerMessage,
} from "./messages";

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
    private shutdownInitiated: boolean = false;

    constructor(protected automations: AutomationServer,
                protected configuration: Configuration,
                protected listeners: AutomationEventListener[] = [],
                protected numWorkers: number = require("os").cpus().length) {
        super(automations, configuration, listeners);

        registerHealthIndicator(() => {
            if (this.webSocket && this.registration) {
                return { status: HealthStatus.Up, detail: "WebSocket connection established" };
            } else {
                return { status: HealthStatus.Down, detail: "WebSocket disconnected" };
            }
        });

        registerShutdownHook(() => {
           this.shutdownInitiated = true;
           return Promise.resolve(0);
        }, Number.MIN_VALUE);
    }

    public onRegistration(registration: RegistrationConfirmation) {
        logger.info("Registration successful: %s", stringify(registration));
        (this.configuration.ws as any).session = registration;
        this.registration = registration;

        broadcast({
            type: "registration",
            registration: this.registration,
            context: null,
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
        const clearNamespace = this.clearNamespace;

        function attachEvents(worker: cluster.Worker, deferred: Deferred<any>) {

            worker.on("message", message => {
                const msg = message as WorkerMessage;

                // Wait for online message to come in
                if (msg.type === "online") {
                    deferred.resolve();
                    return;
                }

                const ses = namespace.create();
                ses.run(() => {
                    namespace.set(msg.context);

                    logger.debug("Received '%s' message from worker '%s': %j", msg.type, worker.id, msg.context);

                    const invocationId = namespace.get().invocationId;
                    const ctx = hydrateContext(msg);
                    if (msg.type === "message") {

                        let messageClient: MessageClient;
                        if (commands.has(invocationId)) {
                            messageClient = commands.get(invocationId).context.messageClient;
                        } else if (events.has(invocationId)) {
                            messageClient = events.get(invocationId).context.messageClient;
                        } else {
                            logger.error("Can't handle message from worker due to missing messageClient");
                            clearNamespace();
                            return;
                        }

                        if (msg.data.destinations && msg.data.destinations.length > 0) {
                            messageClient.send(msg.data.message, msg.data.destinations, msg.data.options)
                                .then(clearNamespace, clearNamespace);
                        } else {
                            messageClient.respond(msg.data.message, msg.data.options)
                                .then(clearNamespace, clearNamespace);
                        }
                    } else if (msg.type === "status") {
                        sendMessage(msg.data, ws());
                    } else if (msg.type === "command_success") {
                        listeners.map(l => () => l.commandSuccessful(msg.event as CommandInvocation,
                            ctx, msg.data as HandlerResult))
                            .reduce((p, f) => p.then(f), Promise.resolve())
                            .then(() => {
                                if (commands.has(invocationId)) {
                                    commands.get(invocationId).result.resolve(msg.data as HandlerResult);
                                    commands.delete(invocationId);
                                }
                                clearNamespace();
                            })
                            .catch(clearNamespace);
                    } else if (msg.type === "command_failure") {
                        listeners.map(l => () => l.commandFailed(msg.event as CommandInvocation,
                            ctx, msg.data as HandlerResult))
                            .reduce((p, f) => p.then(f), Promise.resolve())
                            .then(() => {
                                if (commands.has(invocationId)) {
                                    commands.get(invocationId).result.resolve(msg.data as HandlerResult);
                                    commands.delete(invocationId);
                                }
                                clearNamespace();
                            })
                            .catch(clearNamespace);
                    } else if (msg.type === "event_success") {
                        listeners.map(l => () => l.eventSuccessful(msg.event as EventFired<any>,
                            ctx, msg.data as HandlerResult[]))
                            .reduce((p, f) => p.then(f), Promise.resolve())
                            .then(() => {
                                if (events.has(invocationId)) {
                                    events.get(invocationId).result.resolve(msg.data as HandlerResult[]);
                                    events.delete(invocationId);
                                }
                                clearNamespace();
                            })
                            .catch(clearNamespace);
                    } else if (msg.type === "event_failure") {
                        listeners.map(l => () => l.eventFailed(msg.event as EventFired<any>,
                            ctx, msg.data as HandlerResult[]))
                            .reduce((p, f) => p.then(f), Promise.resolve())
                            .then(() => {
                                if (events.has(invocationId)) {
                                    events.get(invocationId).result.resolve(msg.data as HandlerResult[]);
                                    events.delete(invocationId);
                                }
                                clearNamespace();
                            })
                            .catch(clearNamespace);
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
            logger.warn(`Worker '${worker.id}' disconnected`);
        });

        cluster.on("online", worker => {
            logger.debug(`Worker '${worker.id}' connected`);
        });

        cluster.on("exit", (worker, code, signal) => {
            if (code !== 0 && !this.shutdownInitiated) {
                logger.warn(`Worker '${worker.id}' exited with '${code}' '${signal}'. Restarting ...`);
                attachEvents(cluster.fork(), new Deferred());
            }
        });

        return Promise.all(promises);
    }

    protected invokeCommand(ci: CommandInvocation,
                            ctx: HandlerContext & AutomationContextAware,
                            command: CommandIncoming,
                            callback: (result: Promise<HandlerResult>) => void) {
        const message: MasterMessage = {
            type: "command",
            registration: this.registration,
            context: ctx.context,
            data: command,
        };

        const dispatched = new Dispatched(new Deferred<HandlerResult>(), ctx);
        this.commands.set(ctx.context.invocationId, dispatched);
        const worker = this.assignWorker();
        logger.debug("Incoming command handler request '%s' dispatching to worker '%s'", ci.name, worker.id);
        worker.send(message);
        callback(dispatched.result.promise);
    }

    protected invokeEvent(ef: EventFired<any>,
                          ctx: HandlerContext & AutomationContextAware,
                          event: EventIncoming,
                          callback: (results: Promise<HandlerResult[]>) => void) {
        const message: MasterMessage = {
            type: "event",
            registration: this.registration,
            context: ctx.context,
            data: event,
        };

        const dispatched = new Dispatched(new Deferred<HandlerResult[]>(), ctx);
        this.events.set(ctx.context.invocationId, dispatched);
        const worker = this.assignWorker();
        logger.debug("Incoming event handler subscription '%s' dispatching to worker '%s'",
            ef.extensions.operationName, worker.id);
        worker.send(message);
        callback(dispatched.result.promise);
    }

    protected sendStatusMessage(payload: any, ctx: HandlerContext & AutomationContextAware): Promise<any> {
        return Promise.resolve(
            sendMessage(payload, this.webSocket),
        );
    }

    protected createGraphClient(event: CommandIncoming | EventIncoming): GraphClient {
        return null;
    }

    protected createMessageClient(event: CommandIncoming | EventIncoming): MessageClient {
        if (isCommandIncoming(event)) {
            return new WebSocketCommandMessageClient(event, this.webSocket);
        } else if (isEventIncoming(event)) {
            return new WebSocketEventMessageClient(event, this.webSocket);
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

    constructor(public result: Deferred<T>, public context: HandlerContext) { }
}

function hydrateContext(msg: WorkerMessage): HandlerContext {
    return {
        invocationId: msg.context.invocationId,
        correlationId: msg.context.correlationId,
        workspaceId: msg.context.workspaceId,
        context: msg.context,
    } as any as HandlerContext;
}
