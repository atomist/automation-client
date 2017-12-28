import { SlackMessage } from "@atomist/slack-messages/SlackMessages";
import {
    EventFired,
    HandlerContext,
    HandlerResult,
} from "../index";
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

export interface AutomationEventListener {

    registrationSuccessful(handler: RequestProcessor): void;

    contextCreated(context: HandlerContext): void;

    commandIncoming(payload: CommandIncoming): void;
    commandStarting(payload: CommandInvocation, ctx: HandlerContext): void;
    commandSuccessful(payload: CommandInvocation, ctx: HandlerContext, result: HandlerResult): Promise<any>;
    commandFailed(payload: CommandInvocation, ctx: HandlerContext, err: any): Promise<any>;

    eventIncoming(payload: EventIncoming): void;
    eventStarting(payload: EventFired<any>, ctx: HandlerContext): void;
    eventSuccessful(payload: EventFired<any>, ctx: HandlerContext, result: HandlerResult[]): Promise<any>;
    eventFailed(payload: EventFired<any>, ctx: HandlerContext, err: any): Promise<any>;

    messageSent(message: any,
                destinations: Destination | Destination[],
                options: MessageOptions,
                ctx: HandlerContext): void;

}

export class AutomationEventListenerSupport implements AutomationEventListener {

    public registrationSuccessful(handler: RequestProcessor) {
        // This is intentionally left empty
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

    public commandSuccessful(payload: CommandInvocation, ctx: HandlerContext, result: HandlerResult): Promise<any> {
        return Promise.resolve();
    }

    public commandFailed(payload: CommandInvocation, ctx: HandlerContext, err: any): Promise<any> {
        return Promise.resolve();
    }

    public eventIncoming(payload: EventIncoming) {
        // This is intentionally left empty
    }

    public eventStarting(payload: EventFired<any>, ctx: HandlerContext) {
        // This is intentionally left empty
    }

    public eventSuccessful(payload: EventFired<any>, ctx: HandlerContext, result: HandlerResult[]): Promise<any> {
        return Promise.resolve();
    }

    public eventFailed(payload: EventFired<any>, ctx: HandlerContext, err: any): Promise<any> {
        return Promise.resolve();
    }

    public messageSent(message: any,
                       destinations: Destination | Destination[],
                       options: MessageOptions,
                       ctx: HandlerContext) {
        // This is intentionally left empty
    }
}
