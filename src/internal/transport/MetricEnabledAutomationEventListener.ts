import { EventFired } from "../../HandleEvent";
import { HandlerContext } from "../../HandlerContext";
import { HandlerResult } from "../../HandlerResult";
import {
    AutomationEventListener,
    AutomationEventListenerSupport,
} from "../../server/AutomationEventListener";
import { CommandInvocation } from "../invoker/Payload";
import * as namespace from "../util/cls";
import { duration } from "../util/metric";

export class MetricEnabledAutomationEventListener
    extends AutomationEventListenerSupport implements AutomationEventListener {

    public commandSuccessful(payload: CommandInvocation, ctx: HandlerContext, result: HandlerResult): Promise<any> {
        const start = +namespace.get().ts;
        duration(`command_handler.${payload.name}.success`, Date.now() - start);
        duration(`command_handler.global`, Date.now() - start);
        return Promise.resolve();
    }

    public commandFailed(payload: CommandInvocation, ctx: HandlerContext, err: any): Promise<any> {
        const start = +namespace.get().ts;
        duration(`command_handler.${payload.name}.failure`, Date.now() - start);
        duration(`command_handler.global`, Date.now() - start);
        return Promise.resolve();
    }

    public eventSuccessful(payload: EventFired<any>, ctx: HandlerContext, result: HandlerResult[]): Promise<any> {
        const start = +namespace.get().ts;
        duration(`event_handler.${payload.extensions.operationName}.success`,
            Date.now() - start);
        duration(`event_handler.global`, Date.now() - start);
        return Promise.resolve();
    }

    public eventFailed(payload: EventFired<any>, ctx: HandlerContext, err: any): Promise<any> {
        const start = +namespace.get().ts;
        duration(`event_handler.${payload.extensions.operationName}.failure`,
            Date.now() - start);
        duration(`event_handler.global`, Date.now() - start);
        return Promise.resolve();
    }
}
