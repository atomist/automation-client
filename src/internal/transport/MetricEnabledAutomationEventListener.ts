import {
    EventFired,
    HandlerContext,
    HandlerResult,
} from "../../index";
import {
    AutomationEventListener,
    AutomationEventListenerSupport,
} from "../../server/AutomationEventListener";
import { CommandInvocation } from "../invoker/Payload";
import * as namespace from "../util/cls";
import { duration } from "../util/metric";

export class MetricEnabledAutomationEventListener
    extends AutomationEventListenerSupport implements AutomationEventListener {

    public commandSuccessful(payload: CommandInvocation, ctx: HandlerContext, result: HandlerResult) {
        const start = +namespace.get().ts;
        duration(`command_handler.${payload.name}.success`, Date.now() - start);
        duration(`command_handler.global`, Date.now() - start);
    }

    public commandFailed(payload: CommandInvocation, ctx: HandlerContext, err: any) {
        const start = +namespace.get().ts;
        duration(`command_handler.${payload.name}.failure`, Date.now() - start);
        duration(`command_handler.global`, Date.now() - start);

    }

    public eventSuccessful(payload: EventFired<any>, ctx: HandlerContext, result: HandlerResult[]) {
        const start = +namespace.get().ts;
        duration(`event_handler.${payload.extensions.operationName}.success`,
            Date.now() - start);
        duration(`event_handler.global`, Date.now() - start);
    }

    public eventFailed(payload: EventFired<any>, ctx: HandlerContext, err: any) {
        const start = +namespace.get().ts;
        duration(`event_handler.${payload.extensions.operationName}.failure`,
            Date.now() - start);
        duration(`event_handler.global`, Date.now() - start);
    }
}
