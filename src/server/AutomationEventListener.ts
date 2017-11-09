import { EventFired } from "../HandleEvent";
import { HandlerContext, HandlerResult } from "../index";
import { CommandInvocation } from "../internal/invoker/Payload";
import { RequestProcessor } from "../internal/transport/RequestProcessor";

export interface AutomationEventListener {

    registrationSuccessful(handler: RequestProcessor): void;

    contextCreated(context: HandlerContext): void;

    commandStarting(payload: CommandInvocation, ctx: HandlerContext): void;
    commandSuccessful(payload: CommandInvocation, ctx: HandlerContext, result: HandlerResult): void;
    commandFailed(payload: CommandInvocation, ctx: HandlerContext, err: any): void;

    eventStarting(payload: EventFired<any>, ctx: HandlerContext): void;
    eventSuccessful(payload: EventFired<any>, ctx: HandlerContext, result: HandlerResult[]): void;
    eventFailed(payload: EventFired<any>, ctx: HandlerContext, err: any): void;

}

export class AutomationEventListenerSupport implements AutomationEventListener {

    public registrationSuccessful(handler: RequestProcessor): void {
        // This is intentionally left empty
    }

    public contextCreated(context: HandlerContext): void {
        // This is intentionally left empty
    }

    public commandStarting(payload: CommandInvocation, ctx: HandlerContext): void {
        // This is intentionally left empty
    }

    public commandSuccessful(payload: CommandInvocation, ctx: HandlerContext, result: HandlerResult): void {
        // This is intentionally left empty
    }

    public commandFailed(payload: CommandInvocation, ctx: HandlerContext, err: any): void {
        // This is intentionally left empty
    }

    public eventStarting(payload: EventFired<any>, ctx: HandlerContext): void {
        // This is intentionally left empty
    }

    public eventSuccessful(payload: EventFired<any>, ctx: HandlerContext, result: HandlerResult[]): void {
        // This is intentionally left empty
    }

    public eventFailed(payload: EventFired<any>, ctx: HandlerContext, err: any): void {
        // This is intentionally left empty
    }
}
