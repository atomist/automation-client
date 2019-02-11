import { AutomationClient } from "../automationClient";
import { EventFired } from "../HandleEvent";
import { HandlerContext } from "../HandlerContext";
import { HandlerResult } from "../HandlerResult";
import { CommandInvocation } from "../internal/invoker/Payload";
import {
    CommandIncoming,
    EventIncoming,
    RequestProcessor,
} from "../internal/transport/RequestProcessor";
import {
    Destination,
    MessageOptions,
} from "../spi/message/MessageClient";

/**
 * Listener to receive automation client, command and event handler execution related events.
 *
 * Register listener implementations in the configuration.listeners property of the client.
 */
export interface AutomationEventListener {

    /**
     * WebSocket registration was successful
     * @param handler
     */
    registrationSuccessful(handler: RequestProcessor): void;

    /**
     * Client startup successful
     * @param client
     */
    startupSuccessful?(client: AutomationClient): Promise<void>;

    /**
     * HandlerContext object created
     * This gets invoked for every incoming command and event invocation
     * @param context
     */
    contextCreated(context: HandlerContext): void;

    /**
     * Raw incoming command payload
     * @param payload
     */
    commandIncoming(payload: CommandIncoming): void;

    /**
     * Converted command invocation and created HandlerContext
     * @param payload
     * @param ctx
     */
    commandStarting(payload: CommandInvocation, ctx: HandlerContext): void;

    /**
     * Command execution successful
     * @param payload
     * @param ctx
     * @param result
     */
    commandSuccessful(payload: CommandInvocation, ctx: HandlerContext, result: HandlerResult): Promise<void>;

    /**
     * Command execution failed
     * @param payload
     * @param ctx
     * @param err
     */
    commandFailed(payload: CommandInvocation, ctx: HandlerContext, err: any): Promise<void>;

    /**
     * Raw incoming event payload
     * @param payload
     */
    eventIncoming(payload: EventIncoming): void;

    /**
     * Converted event invocation and created HandlerContext
     * @param payload
     * @param ctx
     */
    eventStarting(payload: EventFired<any>, ctx: HandlerContext): void;

    /**
     * Event execution successful
     * @param payload
     * @param ctx
     * @param result
     */
    eventSuccessful(payload: EventFired<any>, ctx: HandlerContext, result: HandlerResult[]): Promise<void>;

    /**
     * Event execution failed
     * @param payload
     * @param ctx
     * @param err
     */
    eventFailed(payload: EventFired<any>, ctx: HandlerContext, err: any): Promise<void>;

    /**
     * Message will be sent via the MessageClient. Return a potentially modified message to be sent.
     * @param message
     * @param destinations
     * @param options
     * @param ctx
     */
    messageSending(message: any,
                   destinations: Destination | Destination[],
                   options: MessageOptions,
                   ctx: HandlerContext): Promise<any>;

    /**
     * Message was sent via the MessageClient
     * @param message
     * @param destinations
     * @param options
     * @param ctx
     */
    messageSent(message: any,
                destinations: Destination | Destination[],
                options: MessageOptions,
                ctx: HandlerContext): Promise<void>;

}

export class AutomationEventListenerSupport implements AutomationEventListener {

    public registrationSuccessful(handler: RequestProcessor) {
        // This is intentionally left empty
    }

    public startupSuccessful(client: AutomationClient): Promise<void> {
        return Promise.resolve();
    }

    public contextCreated(context: HandlerContext) {
        // This is intentionally left empty
    }

    public commandIncoming(payload: CommandIncoming) {
        // This is intentionally left empty
    }

    public commandStarting(payload: CommandInvocation, ctx: HandlerContext) {
        // This is intentionally left empty
    }

    public commandSuccessful(payload: CommandInvocation, ctx: HandlerContext, result: HandlerResult): Promise<void> {
        return Promise.resolve();
    }

    public commandFailed(payload: CommandInvocation, ctx: HandlerContext, err: any): Promise<void> {
        return Promise.resolve();
    }

    public eventIncoming(payload: EventIncoming) {
        // This is intentionally left empty
    }

    public eventStarting(payload: EventFired<any>, ctx: HandlerContext) {
        // This is intentionally left empty
    }

    public eventSuccessful(payload: EventFired<any>, ctx: HandlerContext, result: HandlerResult[]): Promise<void> {
        return Promise.resolve();
    }

    public eventFailed(payload: EventFired<any>, ctx: HandlerContext, err: any): Promise<void> {
        return Promise.resolve();
    }

    public messageSending(message: any,
                          destinations: Destination | Destination[],
                          options: MessageOptions,
                          ctx: HandlerContext): Promise<any> {
        return Promise.resolve(message);
    }

    public messageSent(message: any,
                       destinations: Destination | Destination[],
                       options: MessageOptions,
                       ctx: HandlerContext): Promise<void> {
        return Promise.resolve();
    }
}
