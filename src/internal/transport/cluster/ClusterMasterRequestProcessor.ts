import { SlackMessage } from "@atomist/slack-messages/SlackMessages";
import * as cluster from "cluster";
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
import {
    HealthStatus,
    registerHealthIndicator,
} from "../../util/health";
import { logger } from "../../util/logger";
import { AbstractEventStoringRequestProcessor } from "../AbstractEventStoringRequestProcessor";
import { clearNamespace } from "../AbstractRequestProcessor";
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

/**
 * A RequestProcessor that delegates to Node.JS Cluster workers to do the actual
 * command and event processing.
 * @see ClusterWorkerRequestProcessor
 */
export class ClusterMasterRequestProcessor extends AbstractEventStoringRequestProcessor
    implements WebSocketRequestProcessor {

    private registration?: RegistrationConfirmation;
    private webSocket?: WebSocket;
    private currentWorker: number = 1;
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

        this.init();
    }

    public onRegistration(registration: RegistrationConfirmation) {
        logger.info("Registration successful: %s", JSON.stringify(registration));
        global.setJwtToken(registration.jwt);
        this.registration = registration;
    }

    public onConnect(ws: WebSocket) {
        logger.info("WebSocket connection established. Listening for incoming messages");
        this.webSocket = ws;
        this.listeners.forEach(l => l.registrationSuccessful(this));

        const message = {
            type: "registration",
            data: this.registration,
        };

        for (const id in cluster.workers) {
            if (cluster.workers.hasOwnProperty(id)) {
                const worker = cluster.workers[id];
                worker.send(message);
            }
        }
    }

    public onDisconnect() {
        this.webSocket = null;
        this.registration = null;
    }

    protected invokeCommand(ci: CommandInvocation,
                            ctx: HandlerContext,
                            command: CommandIncoming,
                            callback: (result: Promise<HandlerResult>) => void) {
        (command as any).ts = namespace.get().ts;
        (command as any).invocationId = namespace.get().invocationId;

        const message = {
            type: "command",
            cls: {
                ...namespace.get(),
            },
            context: {
                teamId: ctx.teamId,
                correlationId: ctx.correlationId,
                invocationId: ctx.invocationId,
                ts: namespace.get().ts,
            },
            data: command,
        };

        const dispatched = new Dispatched(new Deferred<HandlerResult>(), ctx);
        this.commands.set(namespace.get().invocationId, dispatched);
        const worker = cluster.workers[this.assignWorker()];
        logger.debug("Incoming command '%s' dispatching to worker '%s'", ci.name, worker.process.pid);
        worker.send(message);
        callback(dispatched.result.promise);
    }

    protected invokeEvent(ef: EventFired<any>,
                          ctx: HandlerContext,
                          event: EventIncoming,
                          callback: (results: Promise<HandlerResult[]>) => void) {
        (event.extensions as any).ts = namespace.get().ts;
        (event.extensions as any).invocation_id = namespace.get().invocationId;

        const message = {
            type: "event",
            cls: {
                ...namespace.get(),
            },
            context: {
                teamId: ctx.teamId,
                correlationId: ctx.correlationId,
                invocationId: ctx.invocationId,
                ts: namespace.get().ts,
            },
            data: event,
        };

        const dispatched = new Dispatched(new Deferred<HandlerResult[]>(), ctx);
        this.events.set(namespace.get().invocationId, dispatched);
        const worker = cluster.workers[this.assignWorker()];
        logger.debug("Incoming event '%s' dispatching to worker '%s'", ef.extensions.operationName, worker.process.pid);
        worker.send(message);
        callback(dispatched.result.promise);
    }

    protected sendMessage(payload: any) {
        sendMessage(payload, this.webSocket);
    }

    protected createGraphClient(event: CommandIncoming | EventIncoming): GraphClient {
        return null;
    }

    protected doCreateMessageClient(event: CommandIncoming | EventIncoming): MessageClient {
        if (isCommandIncoming(event)) {
            return new WebSocketCommandMessageClient(event, this.automations, this.webSocket);
        } else if (isEventIncoming(event)) {
            return new WebSocketEventMessageClient(event, this.automations, this.webSocket);
        }
    }

    private assignWorker(): string {
        const thisWorker = this.currentWorker;
        if (this.currentWorker < this.numWorkers) {
            this.currentWorker++;
        } else {
            this.currentWorker = 1;
        }
        return thisWorker.toString();
    }

    private init() {
        const ws = () => this.webSocket;
        const listeners = this.listeners;

        for (let i = 0; i < this.numWorkers; i++) {
            const worker = cluster.fork();

            worker.on("message", msg => {
                const ses = namespace.init();
                ses.run(() => {
                    namespace.set(msg.cls);
                    const invocationId = namespace.get().invocationId;
                    if (msg.type === "message") {

                        let messageClient: MessageClient;
                        if (this.commands.has(invocationId)) {
                            messageClient = this.commands.get(invocationId).context.messageClient;
                        } else if (this.events.has(invocationId)) {
                            messageClient = this.events.get(invocationId).context.messageClient;
                        } else {
                            // TODO will that ever happen?
                            logger.warn("Can't handle message from worker due to missing messageClient");
                            clearNamespace();
                            return;
                        }

                        if (msg.data.userNames && msg.data.userNames.length > 0) {
                            messageClient.addressUsers(msg.data.message as string | SlackMessage,
                                msg.data.userNames, msg.data.options)
                                .then(() => clearNamespace());
                        } else if (msg.data.channelNames && msg.data.channelNames.length > 0) {
                            messageClient.addressChannels(msg.data.message as string | SlackMessage,
                                msg.data.channelNames, msg.data.options)
                                .then(() => clearNamespace());
                        } else {
                            messageClient.respond(msg.data.message as string | SlackMessage, msg.data.options)
                                .then(() => clearNamespace());
                        }

                    } else if (msg.type === "status") {
                        sendMessage(msg.data, ws());
                        clearNamespace();
                    } else if (msg.type === "command_success") {
                        listeners.forEach(l => l.commandSuccessful(msg.event as CommandInvocation,
                            null, msg.data as HandlerResult));
                        if (this.commands.has(invocationId)) {
                            this.commands.get(invocationId).result.resolve(msg.data as HandlerResult);
                            this.commands.delete(invocationId);
                        }
                        clearNamespace();
                    } else if (msg.type === "command_failure") {
                        listeners.forEach(l => l.commandFailed(msg.event as CommandInvocation,
                            null, msg.data));
                        if (this.commands.has(invocationId)) {
                            this.commands.get(invocationId).result.resolve(msg.data as HandlerResult);
                            this.commands.delete(invocationId);
                        }
                        clearNamespace();
                    } else if (msg.type === "event_success") {
                        listeners.forEach(l => l.eventSuccessful(msg.event as EventFired<any>,
                            null, msg.data as HandlerResult[]));
                        if (this.events.has(invocationId)) {
                            this.events.get(invocationId).result.resolve(msg.data as HandlerResult[]);
                            this.events.delete(invocationId);
                        }
                        clearNamespace();
                    } else if (msg.type === "event_failure") {
                        listeners.forEach(l => l.eventFailed(msg.event as EventFired<any>,
                            null, msg.data));
                        if (this.events.has(invocationId)) {
                            this.events.get(invocationId).result.resolve(msg.data as HandlerResult[]);
                            this.events.delete(invocationId);
                        }
                        clearNamespace();
                    }
                });
            });
        }
    }
}

class Dispatched<T> {

    constructor(public result: Deferred<T>, public context: HandlerContext) {}
}

class Deferred<T> {
    public promise: Promise<T>;

    private fate: "resolved" | "unresolved";
    private state: "pending" | "fulfilled" | "rejected";

    // tslint:disable-next-line:ban-types
    private deferredResolve: Function;
    // tslint:disable-next-line:ban-types
    private deferredReject: Function;

    constructor() {
        this.state = "pending";
        this.fate = "unresolved";
        this.promise = new Promise((resolve, reject) => {
            this.deferredResolve = resolve;
            this.deferredReject = reject;
        });
        this.promise.then(
            () => this.state = "fulfilled",
            () => this.state = "rejected",
        );
    }

    public resolve(value?: any) {
        if (this.fate === "resolved") {
            throw new Error("Deferred cannot be resolved twice");
        }
        this.fate = "resolved";
        this.deferredResolve(value);
    }

    public reject(reason?: any) {
        if (this.fate === "resolved") {
            throw new Error("Deferred cannot be resolved twice");
        }
        this.fate = "resolved";
        this.deferredReject(reason);
    }

    public isResolved() {
        return this.fate === "resolved";
    }

    public isPending() {
        return this.state === "pending";
    }

    public isFulfilled() {
        return this.state === "fulfilled";
    }

    public isRejected() {
        return this.state === "rejected";
    }
}
