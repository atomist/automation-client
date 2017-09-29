import { HandlerResult } from "../../HandlerResult";
import { EventFired, HandlerContext } from "../../Handlers";
import { AutomationEventListener, AutomationEventListenerSupport } from "../../server/AutomationEventListener";
import { CommandInvocation } from "../invoker/Payload";
import * as namespace from "../util/cls";
import { duration } from "../util/metric";

export class MetricEnabledAutomationEventListener
    extends AutomationEventListenerSupport implements AutomationEventListener {

    public commandStarting(payload: CommandInvocation, ctx: HandlerContext) {
        namespace.init().set("metric.start", new Date().getTime());
    }

    public commandSuccessful(payload: CommandInvocation, ctx: HandlerContext, result: HandlerResult) {
        const start = +namespace.init().get("metric.start");
        duration(`command_handler.${payload.name}.success`, new Date().getTime() - start);
        duration(`command_handler.global`, new Date().getTime() - start);
    }

    public commandFailed(payload: CommandInvocation, ctx: HandlerContext, err: any) {
        const start = +namespace.init().get("metric.start");
        duration(`command_handler.${payload.name}.failure`, new Date().getTime() - start);
        duration(`command_handler.global`, new Date().getTime() - start);

    }

    public eventStarting(payload: EventFired<any>, ctx: HandlerContext) {
        namespace.init().set("metric.start", new Date().getTime());
    }

    public eventSuccessful(payload: EventFired<any>, ctx: HandlerContext, result: HandlerResult[]) {
        const start = +namespace.init().get("metric.start");
        duration(`event_handler.${payload.extensions.operationName}.success`,
            new Date().getTime() - start);
        duration(`event_handler.global`, new Date().getTime() - start);
    }

    public eventFailed(payload: EventFired<any>, ctx: HandlerContext, err: any) {
        const start = +namespace.init().get("metric.start");
        duration(`event_handler.${payload.extensions.operationName}.failure`,
            new Date().getTime() - start);
        duration(`event_handler.global`, new Date().getTime() - start);
    }
}
