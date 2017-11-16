import { SlackMessage } from "@atomist/slack-messages/SlackMessages";
import { EventFired } from "../HandleEvent";
import { HandlerContext, HandlerResult } from "../index";
import { CommandInvocation } from "../internal/invoker/Payload";
import { CommandIncoming, EventIncoming, RequestProcessor } from "../internal/transport/RequestProcessor";
import { MessageOptions } from "../spi/message/MessageClient";

export interface AutomationEventListener {

    registrationSuccessful(handler: RequestProcessor): void;

    contextCreated(context: HandlerContext): void;

    commandIncoming(payload: CommandIncoming): void;
    commandStarting(payload: CommandInvocation, ctx: HandlerContext): void;
    commandSuccessful(payload: CommandInvocation, ctx: HandlerContext, result: HandlerResult): void;
    commandFailed(payload: CommandInvocation, ctx: HandlerContext, err: any): void;

    eventIncoming(payload: EventIncoming): void;
    eventStarting(payload: EventFired<any>, ctx: HandlerContext): void;
    eventSuccessful(payload: EventFired<any>, ctx: HandlerContext, result: HandlerResult[]): void;
    eventFailed(payload: EventFired<any>, ctx: HandlerContext, err: any): void;

    messageSent(message: string | SlackMessage,
                userNames: string | string[],
                channelName: string | string[],
                options?: MessageOptions): void;

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

    public commandSuccessful(payload: CommandInvocation, ctx: HandlerContext, result: HandlerResult) {
        // This is intentionally left empty
    }

    public commandFailed(payload: CommandInvocation, ctx: HandlerContext, err: any) {
        // This is intentionally left empty
    }

    public eventIncoming(payload: EventIncoming) {
        // This is intentionally left empty
    }

    public eventStarting(payload: EventFired<any>, ctx: HandlerContext) {
        // This is intentionally left empty
    }

    public eventSuccessful(payload: EventFired<any>, ctx: HandlerContext, result: HandlerResult[]) {
        // This is intentionally left empty
    }

    public eventFailed(payload: EventFired<any>, ctx: HandlerContext, err: any) {
        // This is intentionally left empty
    }

    public messageSent(message: string | SlackMessage,
                       userNames: string | string[],
                       channelName: string | string[],
                       options?: MessageOptions) {
        // This is intentionally left empty
    }
}
