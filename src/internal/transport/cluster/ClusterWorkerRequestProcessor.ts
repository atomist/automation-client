import { SlackMessage } from "@atomist/slack-messages/SlackMessages";
import * as stringify from "json-stringify-safe";
import { EventFired } from "../../../HandleEvent";
import { HandlerContext } from "../../../HandlerContext";
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
import * as namespace from "../../util/cls";
import { logger } from "../../util/logger";
import { gc, heapDump } from "../../util/memory";
import { AbstractRequestProcessor } from "../AbstractRequestProcessor";
import {
    CommandIncoming,
    EventIncoming,
    RequestProcessor,
} from "../RequestProcessor";
import { GraphClientFactory } from "../websocket/GraphClientFactory";
import { WebSocketClientOptions } from "../websocket/WebSocketClient";
import { RegistrationConfirmation } from "../websocket/WebSocketRequestProcessor";
import { workerSend } from "./messages";
import { AutomationContext } from "../../util/cls";

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
        workerSend({ type: "online" });
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

    protected sendMessage(payload: any): void {
        workerSend({
            type: "status",
            cls: {
                ...namespace.get(),
            },
            data: payload,
        });
    }

    protected createGraphClient(event: CommandIncoming | EventIncoming): GraphClient {
        return this.graphClients.createGraphClient(event);
    }

    protected createMessageClient(event: EventIncoming | CommandIncoming): MessageClient {
        return new ClusterWorkerMessageClient(event);
    }
}

class ClusterWorkerMessageClient extends MessageClientSupport {

    constructor(protected event: EventIncoming | CommandIncoming) {
        super();
    }

    protected doSend(msg: string | SlackMessage, userNames: string | string[],
                     channelNames: string | string[], options?: MessageOptions): Promise<any> {
        workerSend({
            type: "message",
            cls: {
                ...namespace.get(),
            },
            data: {
                message: msg,
                userNames,
                channelNames,
                options,
            },
        });
        return Promise.resolve();
    }
}

class ClusterWorkerAutomationEventListener extends AutomationEventListenerSupport {

    public commandSuccessful(payload: CommandInvocation, ctx: HandlerContext, result: HandlerResult): void {
       workerSend({
            type: "command_success",
            event: payload,
            cls: {
                ...namespace.get(),
            },
            data: result,
        });
    }

    public commandFailed(payload: CommandInvocation, ctx: HandlerContext, err: any): void {
        workerSend({
            type: "command_failure",
            event: payload,
            cls: {
                ...namespace.get(),
            },
            data: err,
        });
    }

    public eventSuccessful(payload: EventFired<any>, ctx: HandlerContext, result: HandlerResult[]): void {
        workerSend({
            type: "event_success",
            event: payload,
            cls: {
                ...namespace.get(),
            },
            data: result,
        });
    }

    public eventFailed(payload: EventFired<any>, ctx: HandlerContext, err: any): void {
        workerSend({
            type: "event_failure",
            event: payload,
            cls: {
                ...namespace.get(),
            },
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
            worker.setRegistration(msg.data as RegistrationConfirmation);
        } else if (msg.type === "command") {
            worker.setRegistrationIfRequired(msg);
            worker.processCommand(addContext(msg.data, msg.cls) as CommandIncoming);
        } else if (msg.type === "event") {
            worker.setRegistrationIfRequired(msg);
            worker.processEvent(addContext(msg.data, msg.cls) as EventIncoming);
        } else if (msg.type === "gc") {
            gc();
        } else if (msg.type === "heapdump") {
            heapDump();
        }
    });
    return worker;
}

function addContext(data: any, cls: AutomationContext): any {
    data.invocationId = cls.invocationId;
    data.ts = cls.ts;
    return data;
}