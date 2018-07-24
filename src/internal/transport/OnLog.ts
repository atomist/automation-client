import { subscription } from "../../graph/graphQL";
import {
    EventFired,
    HandleEvent,
} from "../../HandleEvent";
import { HandlerContext } from "../../HandlerContext";
import {
    HandlerResult,
    Success,
} from "../../HandlerResult";
import { EventHandlerMetadata } from "../../metadata/automationMetadata";
import { addressEvent } from "../../spi/message/MessageClient";
import { logger } from "../util/logger";

// Subscription to retrieve all Log events for this automation client
const LogSubscription = `subscription OnLog($name: String!, $version: String!) {
  AtomistLog {
    level
    timestamp
    message
    correlation_context @required {
      correlation_id
      automation(name: $name, version: $version) @required {
        name
        version
      }
    }
  }
}`;

export interface Subscription {
    AtomistLog?: AtomistLog[] | null;
}

export interface AtomistLog {
    level?: string | null;
    category?: string | null;
    timestamp?: number | null;
    message?: string | null;
    correlation_context?: CorrelationContext | null;
}

export interface CorrelationContext {
    correlation_id?: string | null;
    automation?: Automation | null;
}

export interface Automation {
    name?: string | null;
    version?: string | null;
}

export const OnLogName: string = "OnLog";

/**
 * Subscribe to AtomistLog events from the API.
 * Note: This event handler will get registered when this is enabled in the automation client configuration
 */
export class OnLog implements HandleEvent<Subscription>, EventHandlerMetadata {

    public name: string = OnLogName;
    public description: string = "Subscribe to AtomistLog events from the API";
    public subscriptionName: string = OnLogName;
    public subscription: string;

    constructor(private eman: string,
                private version: string,
                private logHandlers: LogHandler[] = [ConsoleLogHandler]) {
        this.subscription = subscription({
            subscription: LogSubscription,
            variables: {
                name: eman,
                version,
            },
            inline: true,
        });
    }

    public async handle(e: EventFired<Subscription>, ctx: HandlerContext): Promise<HandlerResult> {
        const log = e.data.AtomistLog[0];

        for (const logHandler of this.logHandlers) {
            await logHandler(log, ctx);
        }

        return Success;
    }
}

/**
 * Maker that gets registered to subscribe to log events
 * @param {string} name
 * @param {string} version
 * @param {LogHandler[]} logHandlers
 * @returns {() => OnLog}
 */
export function onLogMaker(name: string,
                           version: string,
                           logHandlers: LogHandler[]) {
    return () => new OnLog(name, version, logHandlers);
}

/**
 * Handler that can get added to the automation client configuration to handle log messages
 */
export type LogHandler = (log: AtomistLog, ctx: HandlerContext) => Promise<void>;

/**
 * Send AtomistLog message.
 * @param {AtomistLog} log
 * @param {HandlerContext} ctx
 * @returns {Promise<any>}
 */
export function sendLog(log: AtomistLog, ctx: HandlerContext): Promise<any> {
    return ctx.messageClient.send(log, addressEvent("AtomistLog"));
}

/**
 * Default console logging LogHandler
 * @param {AtomistLog} log
 * @param {HandlerContext} ctx
 * @returns {Promise<void>}
 * @constructor
 */
const ConsoleLogHandler: LogHandler = async log => {
    const date = new Date(log.timestamp);
    logger.log(log.level, `Incoming log message '${date} [${log.correlation_context.correlation_id}] ${log.message}'`);
};
