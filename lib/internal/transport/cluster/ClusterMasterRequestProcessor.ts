import * as cluster from "cluster";
import { StatsD } from "hot-shots";
import * as stringify from "json-stringify-safe";
import * as _ from "lodash";
import * as TinyQueue from "tinyqueue";
import * as WebSocket from "ws";
import { Configuration } from "../../../configuration";
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
import { printError } from "../../../util/error";
import { logger } from "../../../util/logger";
import { CommandInvocation } from "../../invoker/Payload";
import * as namespace from "../../util/cls";
import { Deferred } from "../../util/Deferred";
import {
    HealthStatus,
    registerHealthIndicator,
} from "../../util/health";
import { poll } from "../../util/poll";
import {
    registerShutdownHook,
    safeExit,
    terminationGraceful,
    terminationGracePeriod,
} from "../../util/shutdown";
import { AbstractRequestProcessor } from "../AbstractRequestProcessor";
import {
    CommandIncoming,
    EventIncoming,
    isCommandIncoming,
    isEventIncoming,
} from "../RequestProcessor";
import { WebSocketLifecycle } from "../websocket/WebSocketLifecycle";
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

interface MessageType {
    message: MasterMessage;
    dispatched: Dispatched<any>;
    ts: number;
}

/* tslint:disable:max-file-line-count */

/**
 * A RequestProcessor that delegates to Node.JS Cluster workers to do the actual
 * command and event processing.
 * @see ClusterWorkerRequestProcessor
 */
export class ClusterMasterRequestProcessor extends AbstractRequestProcessor implements WebSocketRequestProcessor {

    private registration?: RegistrationConfirmation;
    private readonly webSocketLifecycle: WebSocketLifecycle;
    private readonly commands: Map<string, { dispatched: Dispatched<HandlerResult>, worker: number }> = new Map();
    private readonly events: Map<string, { dispatched: Dispatched<HandlerResult[]>, worker: number }> = new Map();
    private readonly messages: TinyQueue<MessageType> = new TinyQueue([], (a: MessageType, b: MessageType) => {
        if (a.message.type === "atomist:command" && b.message.type !== "atomist:command") {
            return -1;
        } else if (a.message.type !== "atomist:command" && b.message.type === "atomist:command") {
            return 1;
        } else {
            return a.ts - b.ts;
        }
    });
    private shutdownInitiated: boolean = false;
    private replaceWorkers: boolean = true;
    private backoffInitiated: boolean = false;

    constructor(protected automations: AutomationServer,
                protected configuration: Configuration,
                protected listeners: AutomationEventListener[] = [],
                protected numWorkers: number = require("os").cpus().length,
                protected maxConcurrentPerWorker: number = 4) {
        super(automations, configuration, listeners);
        this.webSocketLifecycle = (configuration.ws as any).lifecycle as WebSocketLifecycle;

        registerHealthIndicator(() => {
            const cmds: string[] = [];
            for (const key of this.commands.keys()) {
                cmds.push(key);
            }

            const evts: string[] = [];
            for (const key of this.events.keys()) {
                evts.push(key);
            }

            if (this.webSocketLifecycle.connected() && this.registration) {
                return {
                    status: HealthStatus.Up,
                    detail: {
                        commands: cmds,
                        events: evts,
                    },
                };
            } else {
                return {
                    status: HealthStatus.Down,
                    detail: {
                        commands: cmds,
                        events: evts,
                    },
                };
            }
        });

        registerShutdownHook(async () => {
            if (this.shutdownInitiated) {
                return 0;
            }
            this.shutdownInitiated = true;
            const gracePeriod = terminationGracePeriod(this.configuration);
            if (terminationGraceful(this.configuration)) {
                try {
                    logger.debug("Waiting for queue to empty");
                    await poll(() => this.queueLength() < 1, gracePeriod);
                } catch (e) {
                    logger.warn("Work queue did not empty within grace period");
                    return 1;
                }
            }
            logger.debug("Terminating workers");
            await this.terminateWorkers(gracePeriod);
            return 0;
        }, 0, "drain work queue and shutdown workers");

        this.scheduleQueueLength();
        this.scheduleBackoffCheck();
    }

    public onRegistration(registration: RegistrationConfirmation): void {
        logger.info("Registration successful: %s", stringify(registration));
        (this.configuration.ws as any).session = registration;
        this.registration = registration;

        broadcast({
            type: "atomist:registration",
            registration: this.registration,
            context: undefined,
        });
    }

    public onConnect(ws: WebSocket): void {
        logger.info("WebSocket connection established. Listening for incoming messages");
        this.webSocketLifecycle.set(ws);
        this.listeners.forEach(l => l.registrationSuccessful(this));
    }

    public onDisconnect(): void {
        this.webSocketLifecycle.reset();
        this.registration = undefined;
    }

    public run(): Promise<any> {
        const ws = () => this.webSocketLifecycle;

        const attachEvents = (worker: cluster.Worker, deferred: Deferred<any>) => {
            worker.on("message", message => {
                const msg = message as WorkerMessage;

                // Wait for online message to come in
                if (msg.type === "atomist:online") {
                    deferred.resolve();
                    return;
                }

                const ses = namespace.create();
                ses.run(() => {
                    // Only process our messages
                    if (!msg.type || (msg.type && !msg.type.startsWith("atomist:"))) {
                        return;
                    }

                    namespace.set(msg.context);

                    logger.debug("Received '%s' message from worker '%s': %j", msg.type, worker.id, msg.context);

                    const invocationId = namespace.get().invocationId;
                    const ctx = hydrateContext(msg);
                    if (msg.type === "atomist:message") {

                        let messageClient: MessageClient;
                        if (this.commands.has(invocationId)) {
                            messageClient = this.commands.get(invocationId).dispatched.context.messageClient;
                        } else if (this.events.has(invocationId)) {
                            messageClient = this.events.get(invocationId).dispatched.context.messageClient;
                        } else {
                            logger.error("Can't handle message from worker due to missing messageClient");
                            this.clearNamespace();
                            return;
                        }

                        if (msg.data.destinations && msg.data.destinations.length > 0) {
                            messageClient.send(msg.data.message, msg.data.destinations, msg.data.options)
                                .then(this.clearNamespace, this.clearNamespace);
                        } else {
                            messageClient.respond(msg.data.message, msg.data.options)
                                .then(this.clearNamespace, this.clearNamespace);
                        }
                    } else if (msg.type === "atomist:status") {
                        ws().send(msg.data);
                    } else if (msg.type === "atomist:command_success") {
                        this.listeners.map(l => () => l.commandSuccessful(msg.event as CommandInvocation,
                            ctx, msg.data as HandlerResult))
                            .reduce((p, f) => p.then(f), Promise.resolve())
                            .then(() => {
                                if (this.commands.has(invocationId)) {
                                    this.commands.get(invocationId).dispatched.result.resolve(msg.data as HandlerResult);
                                    this.commands.delete(invocationId);
                                }
                                this.clearNamespace();
                                this.startMessage();
                            })
                            .catch(e => {
                                logger.warn(`Failed to run listeners: ${e.message}`);
                                printError(e);
                                if (this.commands.has(invocationId)) {
                                    this.commands.get(invocationId).dispatched.result.resolve(msg.data as HandlerResult);
                                    this.commands.delete(invocationId);
                                }
                                this.clearNamespace();
                                this.startMessage();
                            });
                    } else if (msg.type === "atomist:command_failure") {
                        this.listeners.map(l => () => l.commandFailed(msg.event as CommandInvocation,
                            ctx, msg.data as HandlerResult))
                            .reduce((p, f) => p.then(f), Promise.resolve())
                            .then(() => {
                                if (this.commands.has(invocationId)) {
                                    this.commands.get(invocationId).dispatched.result.reject(msg.data as HandlerResult);
                                    this.commands.delete(invocationId);
                                }
                                this.clearNamespace();
                                this.startMessage();
                            })
                            .catch(e => {
                                logger.warn(`Failed to run listeners: ${e.message}`);
                                printError(e);
                                if (this.commands.has(invocationId)) {
                                    this.commands.get(invocationId).dispatched.result.reject(msg.data as HandlerResult);
                                    this.commands.delete(invocationId);
                                }
                                this.clearNamespace();
                                this.startMessage();
                            });
                    } else if (msg.type === "atomist:event_success") {
                        this.listeners.map(l => () => l.eventSuccessful(msg.event as EventFired<any>,
                            ctx, msg.data as HandlerResult[]))
                            .reduce((p, f) => p.then(f), Promise.resolve())
                            .then(() => {
                                if (this.events.has(invocationId)) {
                                    this.events.get(invocationId).dispatched.result.resolve(msg.data as HandlerResult[]);
                                    this.events.delete(invocationId);
                                }
                                this.clearNamespace();
                                this.startMessage();
                            })
                            .catch(e => {
                                logger.warn(`Failed to run listeners: ${e.message}`);
                                printError(e);
                                if (this.events.has(invocationId)) {
                                    this.events.get(invocationId).dispatched.result.resolve(msg.data as HandlerResult);
                                    this.events.delete(invocationId);
                                }
                                this.clearNamespace();
                                this.startMessage();
                            });
                    } else if (msg.type === "atomist:event_failure") {
                        this.listeners.map(l => () => l.eventFailed(msg.event as EventFired<any>,
                            ctx, msg.data as HandlerResult[]))
                            .reduce((p, f) => p.then(f), Promise.resolve())
                            .then(() => {
                                if (this.events.has(invocationId)) {
                                    this.events.get(invocationId).dispatched.result.reject(msg.data as HandlerResult[]);
                                    this.events.delete(invocationId);
                                }
                                this.clearNamespace();
                                this.startMessage();
                            })
                            .catch(e => {
                                logger.warn(`Failed to run listeners: ${e.message}`);
                                printError(e);
                                if (this.events.has(invocationId)) {
                                    this.events.get(invocationId).dispatched.result.reject(msg.data as HandlerResult);
                                    this.events.delete(invocationId);
                                }
                                this.clearNamespace();
                                this.startMessage();
                            });
                    } else if (msg.type === "atomist:shutdown") {
                        logger.info(`Immediate shutdown requested from worker`);
                        this.configuration.ws.termination.graceful = false;
                        safeExit(msg.data);
                    }
                });
            });
        };
        attachEvents.bind(this);

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
            this.startMessage();
        });

        cluster.on("exit", (worker, code, signal) => {
            if (this.replaceWorkers) {
                logger.warn(`Worker '${worker.id}' exited with status '${code}' and signal '${signal}', replacing...`);
                attachEvents(cluster.fork(), new Deferred());
            } else {
                logger.info(`Worker '${worker.id}' shut down with status '${code}' and signal '${signal}'`);
            }
        });

        return Promise.all(promises);
    }

    protected invokeCommand(ci: CommandInvocation,
                            ctx: HandlerContext & AutomationContextAware,
                            command: CommandIncoming,
                            callback: (result: Promise<HandlerResult>) => void): void {
        const message: MasterMessage = {
            type: "atomist:command",
            registration: this.registration,
            context: ctx.context,
            data: command,
        };

        logger.debug(`Queuing incoming command handler request '${command.command}'`);
        const dispatched = new Dispatched(new Deferred<HandlerResult>(), ctx);
        this.messages.push({ message, dispatched, ts: Date.now() });
        callback(dispatched.result.promise);

        this.startMessage();
    }

    protected invokeEvent(ef: EventFired<any>,
                          ctx: HandlerContext & AutomationContextAware,
                          event: EventIncoming,
                          callback: (results: Promise<HandlerResult[]>) => void): void {
        const message: MasterMessage = {
            type: "atomist:event",
            registration: this.registration,
            context: ctx.context,
            data: event,
        };

        logger.debug(`Queuing incoming event subscription '${event.extensions.operationName}'`);
        const dispatched = new Dispatched(new Deferred<HandlerResult[]>(), ctx);
        this.messages.push({ message, dispatched, ts: Date.now() });
        callback(dispatched.result.promise);

        this.startMessage();
    }

    protected async sendStatusMessage(payload: any, ctx: HandlerContext & AutomationContextAware): Promise<any> {
        return this.webSocketLifecycle.send(payload);
    }

    protected createGraphClient(event: CommandIncoming | EventIncoming): GraphClient {
        return undefined;
    }

    protected createMessageClient(event: CommandIncoming | EventIncoming): MessageClient {
        if (isCommandIncoming(event)) {
            return new WebSocketCommandMessageClient(event, this.webSocketLifecycle, this.configuration);
        } else if (isEventIncoming(event)) {
            return new WebSocketEventMessageClient(event, this.webSocketLifecycle, this.configuration);
        }
    }

    private assignWorker(): cluster.Worker | undefined {
        let workers: Array<{ worker: cluster.Worker, messages: number }> = [];
        for (const id in cluster.workers) {
            if (cluster.workers.hasOwnProperty(id)) {
                const worker = cluster.workers[id];
                if (worker.isConnected) {
                    workers.push({ worker, messages: 0 });
                }
            }
        }

        const deadEvents = [];
        this.events.forEach((e, k) => {
            const worker = workers.find(w => w.worker.id === e.worker);
            if (!!worker) {
                worker.messages = worker.messages + 1;
            } else {
                deadEvents.push(k);
            }
        });
        deadEvents.forEach(de => this.events.delete(de));

        const deadCommands = [];
        this.commands.forEach((c, k) => {
            const worker = workers.find(w => w.worker.id === c.worker);
            if (!!worker) {
                worker.messages = worker.messages + 1;
            } else {
                deadCommands.push(k);
            }
        });
        deadCommands.forEach(dc => this.commands.delete(dc));

        workers = workers.filter(w => w.messages < this.maxConcurrentPerWorker);
        if (workers.length === 0) {
            return undefined;
        }
        return workers[Math.floor(Math.random() * workers.length)].worker;
    }

    private startMessage(): void {
        if (this.messages.length > 0) {
            const worker = this.assignWorker();
            if (!!worker) {
                const message = this.messages.pop();
                namespace.set(message.message.context);
                if (message.message.type === "atomist:command") {
                    this.commands.set(message.message.context.invocationId, {
                        dispatched: message.dispatched,
                        worker: worker.id,
                    });
                    logger.debug(
                        "Incoming command handler request '%s' dispatching to worker '%s'",
                        message.message.data.command,
                        worker.id);
                } else if (message.message.type === "atomist:event") {
                    this.events.set(message.message.context.invocationId, {
                        dispatched: message.dispatched,
                        worker: worker.id,
                    });
                    logger.debug(
                        "Incoming event handler subscription '%s' dispatching to worker '%s'",
                        message.message.data.extensions.operationName,
                        worker.id);
                }
                worker.send(message.message);
            }
        }
        this.reportQueueLength();
    }

    private queueLength(): number {
        return this.messages.length + this.events.size + this.commands.size;
    }

    private scheduleQueueLength(): void {
        if (this.configuration.statsd.enabled) {
            setInterval(() => {
                this.reportQueueLength();
            }, 1000).unref();
        }
    }

    private scheduleBackoffCheck(): void {
        const workers = this.numWorkers;
        const maxConcurrent = this.maxConcurrentPerWorker;

        const threshold = _.get(this.configuration, "ws.backoff.threshold") || (workers * maxConcurrent);
        const interval = _.get(this.configuration, "ws.backoff.interval") || 2500;
        const duration = _.get(this.configuration, "ws.backoff.duration") || 5000;

        setInterval(() => {
            const messageCount = this.messages.length;
            const statsd = (this.configuration.statsd as any).__instance as StatsD;
            if (messageCount >= threshold) {
                sendMessage({
                    control: {
                        name: "backoff",
                        params: {
                            millis: duration,
                        },
                    },
                }, this.webSocketLifecycle.get(), false);
                if (!this.backoffInitiated) {
                    logger.info(`Initiated incoming messages backoff. queue size: ${messageCount}, threshold: ${threshold}`);
                }
                this.backoffInitiated = true;
                if (!!statsd) {
                    statsd.gauge(
                        "work_queue.backoff",
                        1,
                        [],
                        () => {});
                }
            } else {
                if (this.backoffInitiated) {
                    logger.info(`Stopped incoming messages backoff. queue size: ${messageCount}, threshold: ${threshold}`);
                }
                this.backoffInitiated = false;
                if (!!statsd) {
                    statsd.gauge(
                        "work_queue.backoff",
                        0,
                        [],
                        () => {});
                }
            }
        }, interval).unref();
    }

    private reportQueueLength(): void {
        if (this.configuration.statsd.enabled) {
            const statsd = (this.configuration.statsd as any).__instance as StatsD;
            if (!!statsd) {
                statsd.gauge(
                    "work_queue.pending",
                    this.messages.length,
                    1,
                    [],
                    () => { /* intentionally empty */
                    },
                );
                statsd.gauge(
                    "work_queue.events",
                    this.events.size,
                    1,
                    [],
                    () => { /* intentionally empty */
                    },
                );
                statsd.gauge(
                    "work_queue.commands",
                    this.commands.size,
                    1,
                    [],
                    () => { /* intentionally empty */
                    },
                );
            }
        }
    }

    private async terminateWorkers(gracePeriod: number): Promise<void> {
        if (!this.replaceWorkers) {
            return;
        }
        this.replaceWorkers = false;
        const workerIds = Object.keys(cluster.workers).map(id => cluster.workers[id].id);
        logger.debug("Sending workers the shutdown message");
        workerIds.forEach(id => cluster.workers[id].send({ type: "atomist:shutdown" }));
        try {
            logger.debug("Waiting for workers to exit");
            await poll(() => Object.keys(cluster.workers).length < 1, gracePeriod);
            logger.debug("All workers have exited");
        } catch (e) {
            logger.warn(`Not all workers exited in allotted time: ${Object.keys(cluster.workers).join(",")}`);
        }
    }
}

class Dispatched<T> {
    constructor(public result: Deferred<T>, public context: HandlerContext) {
    }
}

function hydrateContext(msg: WorkerMessage): HandlerContext {
    return {
        invocationId: msg.context.invocationId,
        correlationId: msg.context.correlationId,
        workspaceId: msg.context.workspaceId,
        context: msg.context,
    } as any as HandlerContext;
}
