import { EventFired } from "../HandleEvent";
import { HandlerContext, HandlerResult } from "../Handlers";
import { CommandInvocation } from "../internal/invoker/Payload";
import { TransportEventHandler } from "../internal/transport/TransportEventHandler";

export interface AutomationEventListener {

    registrationSuccessful(handler: TransportEventHandler);

    commandStarting(payload: CommandInvocation, ctx: HandlerContext);
    commandSuccessful(payload: CommandInvocation, ctx: HandlerContext, result: HandlerResult);
    commandFailed(payload: CommandInvocation, ctx: HandlerContext, err: any);

    eventStarting(payload: EventFired<any>, ctx: HandlerContext);
    eventSuccessful(payload: EventFired<any>, ctx: HandlerContext, result: HandlerResult[]);
    eventFailed(payload: EventFired<any>, ctx: HandlerContext, err: any);

}

export class AutomationEventListenerSupport implements AutomationEventListener {

    public registrationSuccessful(handler: TransportEventHandler) {
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

    public eventStarting(payload: EventFired<any>, ctx: HandlerContext) {
        // This is intentionally left empty
    }

    public eventSuccessful(payload: EventFired<any>, ctx: HandlerContext, result: HandlerResult[]) {
        // This is intentionally left empty
    }

    public  eventFailed(payload: EventFired<any>, ctx: HandlerContext, err: any) {
        // This is intentionally left empty
    }
}
