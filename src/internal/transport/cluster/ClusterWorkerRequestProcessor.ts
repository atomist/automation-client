import { SlackMessage } from "@atomist/slack-messages/SlackMessages";
import * as stringify from "json-stringify-safe";
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
import {
    MessageClient,
    MessageOptions,
} from "../../../spi/message/MessageClient";
import { MessageClientSupport } from "../../../spi/message/MessageClientSupport";
import { CommandInvocation } from "../../invoker/Payload";
import { logger } from "../../util/logger";
import {
    gc,
    heapDump,
} from "../../util/memory";
import { guid } from "../../util/string";
import { AbstractRequestProcessor } from "../AbstractRequestProcessor";
import {
    CommandIncoming,
    EventIncoming,
    RequestProcessor,
} from "../RequestProcessor";
import { GraphClientFactory } from "../websocket/GraphClientFactory";
import { WebSocketClientOptions } from "../websocket/WebSocketClient";
import { RegistrationConfirmation } from "../websocket/WebSocketRequestProcessor";
import { MasterMessage, workerSend } from "./messages";

/**
 * A RequestProcessor that is being run as Node.JS Cluster worker handling all the actual work.
 */
class ClusterWorkerRequestProcessor extends AbstractRequestProcessor {

    private graphClients: GraphClientFactory;
    private registration?: RegistrationConfirmation;

    // tslint:disable-next-line:variable-name
    constructor(private _automations: AutomationServer,
                // tslint:disable-next-line:variable-name
                private _options: WebSocketClientOptions,
                // tslint:disable-next-line:variable-name
                private _listeners: AutomationEventListener[] = []) {
        super(_automations, [..._listeners, new ClusterWorkerAutomationEventListener()]);
        workerSend({ type: "online", context: null });
    }

    public setRegistration(registration: RegistrationConfirmation) {
        logger.debug("Receiving registration: %s", stringify(registration));
        this.registration = registration;
        this.graphClients = new GraphClientFactory(this.registration, this._options);
    }

    public setRegistrationIfRequired(data: any) {
        if (!this.registration) {
            this.setRegistration(data.registration as RegistrationConfirmation);
        }
    }

    protected sendStatusMessage(payload: any, ctx: HandlerContext & AutomationContextAware): Promise<any> {
        return workerSend({
            type: "status",
            context: ctx.context,
            data: payload,
        });
    }

    protected createGraphClient(event: CommandIncoming | EventIncoming,
                                context: AutomationContextAware): GraphClient {
        return this.graphClients.createGraphClient(event);
    }

    protected createMessageClient(event: EventIncoming | CommandIncoming,
                                  context: AutomationContextAware): MessageClient {
        return new ClusterWorkerMessageClient(event, context);
    }

    protected setupNamespace(request: any,
                             automations: AutomationServer,
                             invocationId: string = guid(),
                             ts: number = Date.now()) {
        const context = request.__context;
        delete request.__context;
        return context;
    }
}

class ClusterWorkerMessageClient extends MessageClientSupport {

    constructor(protected event: EventIncoming | CommandIncoming, protected ctx: AutomationContextAware) {
        super();
    }

    protected doSend(msg: string | SlackMessage, userNames: string | string[],
                     channelNames: string | string[], options?: MessageOptions): Promise<any> {
        return workerSend({
                type: "message",
                context: this.ctx.context,
                data: {
                    message: msg,
                    userNames,
                    channelNames,
                    options,
                },
            });
    }
}

class ClusterWorkerAutomationEventListener extends AutomationEventListenerSupport {

    public commandSuccessful(payload: CommandInvocation, ctx: HandlerContext, result: HandlerResult): Promise<any> {
       return workerSend({
            type: "command_success",
            event: payload,
            context: (ctx as any).context,
            data: result,
        });
    }

    public commandFailed(payload: CommandInvocation, ctx: HandlerContext, err: any): Promise<any> {
        return workerSend({
            type: "command_failure",
            event: payload,
            context: (ctx as any).context,
            data: err,
        });
    }

    public eventSuccessful(payload: EventFired<any>, ctx: HandlerContext, result: HandlerResult[]): Promise<any> {
        return workerSend({
            type: "event_success",
            event: payload,
            context: (ctx as any).context,
            data: result,
        });
    }

    public eventFailed(payload: EventFired<any>, ctx: HandlerContext, err: any): Promise<any> {
        return workerSend({
            type: "event_failure",
            event: payload,
            context: (ctx as any).context,
            data: err,
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
                            options: WebSocketClientOptions,
                            listeners: AutomationEventListener[] = []): RequestProcessor {
    const worker = new ClusterWorkerRequestProcessor(automations, options, listeners);
    process.on("message", msg => {
        if (msg.type === "registration") {
            worker.setRegistration(msg.registration as RegistrationConfirmation);
        } else if (msg.type === "command") {
            worker.setRegistrationIfRequired(msg);
            worker.processCommand(decorateContext(msg) as CommandIncoming);
        } else if (msg.type === "event") {
            worker.setRegistrationIfRequired(msg);
            worker.processEvent(decorateContext(msg) as EventIncoming);
        } else if (msg.type === "gc") {
            gc();
        } else if (msg.type === "heapdump") {
            heapDump();
        }
    });
    return worker;
}

function decorateContext(msg: MasterMessage): any {
    const event = msg.data;
    event.__context = msg.context;
    return event;
}
