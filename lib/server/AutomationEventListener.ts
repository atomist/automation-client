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
    registrationSuccessful(handler: RequestProcessor): Promise<void>;

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
    contextCreated(context: HandlerContext): Promise<void>;

    /**
     * Raw incoming command payload
     * @param payload
     */
    commandIncoming(payload: CommandIncoming): Promise<void>;

    /**
     * Converted command invocation and created HandlerContext
     * @param payload
     * @param ctx
     */
    commandStarting(payload: CommandInvocation, ctx: HandlerContext): Promise<void>;

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
    eventIncoming(payload: EventIncoming): Promise<void>;

    /**
     * Converted event invocation and created HandlerContext
     * @param payload
     * @param ctx
     */
    eventStarting(payload: EventFired<any>, ctx: HandlerContext): Promise<void>;

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
                   ctx: HandlerContext): Promise<{ message: any, destinations: Destination | Destination[], options: MessageOptions }>;

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

    public async registrationSuccessful(handler: RequestProcessor): Promise<void> {
        // This is intentionally left empty
    }

    public async startupSuccessful(client: AutomationClient): Promise<void> {
        // This is intentionally left empty
    }

    public async contextCreated(context: HandlerContext): Promise<void> {
        // This is intentionally left empty
    }

    public async commandIncoming(payload: CommandIncoming): Promise<void> {
        // This is intentionally left empty
    }

    public async commandStarting(payload: CommandInvocation, ctx: HandlerContext): Promise<void> {
        // This is intentionally left empty
    }

    public async commandSuccessful(payload: CommandInvocation, ctx: HandlerContext, result: HandlerResult): Promise<void> {
        // This is intentionally left empty
    }

    public async commandFailed(payload: CommandInvocation, ctx: HandlerContext, err: any): Promise<void> {
        // This is intentionally left empty
    }

    public async eventIncoming(payload: EventIncoming): Promise<void> {
        // This is intentionally left empty
    }

    public async eventStarting(payload: EventFired<any>, ctx: HandlerContext): Promise<void> {
        // This is intentionally left empty
    }

    public async eventSuccessful(payload: EventFired<any>, ctx: HandlerContext, result: HandlerResult[]): Promise<void> {
        // This is intentionally left empty
    }

    public async eventFailed(payload: EventFired<any>, ctx: HandlerContext, err: any): Promise<void> {
        // This is intentionally left empty
    }

    public async messageSending(message: any,
                                destinations: Destination | Destination[],
                                options: MessageOptions,
                                ctx: HandlerContext): Promise<{ message: any, destinations: Destination | Destination[], options: MessageOptions }> {
        return {
            message,
            destinations,
            options,
        };
    }

    public async messageSent(message: any,
                             destinations: Destination | Destination[],
                             options: MessageOptions,
                             ctx: HandlerContext): Promise<void> {
        // This is intentionally left empty
    }
}
