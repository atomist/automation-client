import { SlackMessage } from "@atomist/slack-messages";
import * as stringify from "json-stringify-safe";
import * as _ from "lodash";
import { Configuration } from "../../../configuration";
import { EventFired } from "../../../HandleEvent";
import {
    AutomationContextAware,
    HandlerContext,
} from "../../../HandlerContext";
import { HandlerResult } from "../../../HandlerResult";
import {
    AutomationEventListener,
    AutomationEventListenerSupport,
} from "../../../server/AutomationEventListener";
import { AutomationServer } from "../../../server/AutomationServer";
import { GraphClient } from "../../../spi/graph/GraphClient";
import { GraphClientFactory } from "../../../spi/graph/GraphClientFactory";
import {
    Destination,
    MessageClient,
    MessageOptions,
    RequiredMessageOptions,
} from "../../../spi/message/MessageClient";
import { MessageClientSupport } from "../../../spi/message/MessageClientSupport";
import { logger } from "../../../util/logger";
import { CommandInvocation } from "../../invoker/Payload";
import {
    gc,
    heapDump,
} from "../../util/memory";
import { poll } from "../../util/poll";
import {
    registerShutdownHook,
    terminationGraceful,
    terminationGracePeriod,
} from "../../util/shutdown";
import { guid } from "../../util/string";
import { AbstractRequestProcessor } from "../AbstractRequestProcessor";
import {
    CommandIncoming,
    EventIncoming,
    RequestProcessor,
    workspaceId,
} from "../RequestProcessor";
import { RegistrationConfirmation } from "../websocket/WebSocketRequestProcessor";
import {
    MasterMessage,
    workerSend,
} from "./messages";

/**
 * A RequestProcessor that is being run as Node.JS Cluster worker handling all the actual work.
 */
export class ClusterWorkerRequestProcessor extends AbstractRequestProcessor {

    private graphClients: GraphClientFactory;
    private registration?: RegistrationConfirmation;
    private shutdownInitiated: boolean = false;

    /* tslint:disable:variable-name */
    constructor(
        private readonly _automations: AutomationServer,
        private readonly _configuration: Configuration,
        private readonly _listeners: AutomationEventListener[] = [],
    ) {

        super(_automations, _configuration, [..._listeners, new ClusterWorkerAutomationEventListener()]);
        // workerSend is async, so we cannot call it in a constructor
        process.send({ type: "atomist:online", context: undefined });
        process.on("message", msg => {
            if (msg.type === "atomist:registration") {
                this.setRegistration(msg.registration as RegistrationConfirmation);
            } else if (msg.type === "atomist:command") {
                this.setRegistrationIfRequired(msg);
                this.processCommand(decorateContext(msg) as CommandIncoming);
            } else if (msg.type === "atomist:event") {
                this.setRegistrationIfRequired(msg);
                this.processEvent(decorateContext(msg) as EventIncoming);
            } else if (msg.type === "atomist:gc") {
                gc();
            } else if (msg.type === "atomist:heapdump") {
                heapDump();
            } else if (msg.type === "atomist:shutdown") {
                logger.debug("Received shutdown message");
                this.shutdownInitiated = true;
                // async-exit-hook ensures hooks are only run once, so
                // this is safe even if worker already received signal
                process.kill(process.pid);
            }
        });
        registerShutdownHook(async () => {
            if (this.shutdownInitiated) {
                return 0;
            }
            if (!terminationGraceful(this._configuration)) {
                return 0;
            }
            const gracePeriod = terminationGracePeriod(this._configuration);
            try {
                await poll(() => this.shutdownInitiated, gracePeriod * 2);
            } catch (e) {
                logger.warn("Did not receive shutdown message from master within twice the grace period");
                return 1;
            }
            return 0;
        }, 0, "wait for shutdown message");
    }

    /* tslint:enable:variable-name */

    public setRegistration(registration: RegistrationConfirmation): void {
        logger.debug("Receiving registration '%s'", stringify(registration));
        this.registration = registration;
        this.graphClients = this._configuration.graphql.client.factory;
    }

    public setRegistrationIfRequired(data: any): void {
        if (!this.registration) {
            this.setRegistration(data.registration as RegistrationConfirmation);
        }
    }

    public async sendShutdown(code: number, ctx: HandlerContext & AutomationContextAware): Promise<void> {
        await workerSend({ type: "atomist:shutdown", data: code, context: ctx.context });
    }

    protected sendStatusMessage(payload: any, ctx: HandlerContext & AutomationContextAware): Promise<any> {
        return workerSend({
            type: "atomist:status",
            context: ctx.context,
            data: payload,
        });
    }

    protected createGraphClient(event: CommandIncoming | EventIncoming,
                                context: AutomationContextAware): GraphClient {
        return this.graphClients.create(
            workspaceId(event),
            this._configuration);
    }

    protected createMessageClient(event: EventIncoming | CommandIncoming,
                                  context: AutomationContextAware): MessageClient {
        return new ClusterWorkerMessageClient(event, context);
    }

    protected setupNamespace(request: any,
                             automations: AutomationServer,
                             invocationId: string = guid(),
                             ts: number = Date.now()): any {
        const context = request.__context;
        delete request.__context;
        return context;
    }
}

class ClusterWorkerMessageClient extends MessageClientSupport {

    constructor(protected event: EventIncoming | CommandIncoming, protected ctx: AutomationContextAware) {
        super();
    }

    public async delete(destinations: Destination | Destination[],
                        options: RequiredMessageOptions): Promise<void> {
        return this.doSend(
            undefined,
            Array.isArray(destinations) ? destinations : [destinations],
            { ...options, delete: true });
    }

    protected doSend(msg: string | SlackMessage,
                     destinations: Destination | Destination[],
                     options?: MessageOptions): Promise<any> {
        return workerSend({
            type: "atomist:message",
            context: this.ctx.context,
            data: {
                message: msg,
                destinations,
                options,
            },
        });
    }
}

class ClusterWorkerAutomationEventListener extends AutomationEventListenerSupport {

    public commandSuccessful(payload: CommandInvocation, ctx: HandlerContext, result: HandlerResult): Promise<any> {
        return workerSend({
            type: "atomist:command_success",
            event: payload,
            context: (ctx as any).context,
            data: sanitize(result),
        });
    }

    public commandFailed(payload: CommandInvocation, ctx: HandlerContext, err: any): Promise<any> {
        return workerSend({
            type: "atomist:command_failure",
            event: payload,
            context: (ctx as any).context,
            data: sanitize(err),
        });
    }

    public eventSuccessful(payload: EventFired<any>, ctx: HandlerContext, result: HandlerResult[]): Promise<any> {
        return workerSend({
            type: "atomist:event_success",
            event: payload,
            context: (ctx as any).context,
            data: sanitize(result),
        });
    }

    public eventFailed(payload: EventFired<any>, ctx: HandlerContext, err: any): Promise<any> {
        return workerSend({
            type: "atomist:event_failure",
            event: payload,
            context: (ctx as any).context,
            data: sanitize(err),
        });
    }

}

/**
 * Start a new worker node
 * @param {AutomationServer} automations
 * @param {WebSocketClientOptions} options
 * @returns {RequestProcessor}
 */
export function startWorker(automations: AutomationServer,
                            configuration: Configuration,
                            listeners: AutomationEventListener[] = []): ClusterWorkerRequestProcessor {
    const worker = new ClusterWorkerRequestProcessor(automations, configuration, listeners);
    return worker;
}

function decorateContext(msg: MasterMessage): any {
    const event = msg.data;
    event.__context = msg.context;
    return event;
}

function sanitize(obj: any): any {
    const newObj: any = {};
    _.forEach(obj, (v, k) => {
        try {
            JSON.stringify(v);
            newObj[k] = v;
        } catch (e) {
            newObj[k] = "[circular]";
        }
    });
    if (!!obj.message) {
        newObj.message = obj.message;
    }
    if (!!obj.stack) {
        newObj.stack = obj.stack;
    }
    return newObj;
}
