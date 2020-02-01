import { EventFired } from "../../HandleEvent";
import {
    AutomationContextAware,
    HandlerContext,
} from "../../HandlerContext";
import { HandlerResult } from "../../HandlerResult";
import {
    AutomationEventListener,
    AutomationEventListenerSupport,
} from "../../server/AutomationEventListener";
import { CommandInvocation } from "../invoker/Payload";
import { duration } from "../util/metric";

export class MetricEnabledAutomationEventListener
    extends AutomationEventListenerSupport implements AutomationEventListener {

    public async commandSuccessful(payload: CommandInvocation, ctx: HandlerContext, result: HandlerResult): Promise<any> {
        const start = (ctx as any as AutomationContextAware).context.ts;
        duration(`command_handler.${payload.name}.success`, Date.now() - start);
        duration(`command_handler.global`, Date.now() - start);
    }

    public async commandFailed(payload: CommandInvocation, ctx: HandlerContext, err: any): Promise<any> {
        const start = (ctx as any as AutomationContextAware).context.ts;
        duration(`command_handler.${payload.name}.failure`, Date.now() - start);
        duration(`command_handler.global`, Date.now() - start);
    }

    public async eventSuccessful(payload: EventFired<any>, ctx: HandlerContext, result: HandlerResult[]): Promise<any> {
        const start = (ctx as any as AutomationContextAware).context.ts;
        duration(`event_handler.${payload.extensions.operationName}.success`,
            Date.now() - start);
        duration(`event_handler.global`, Date.now() - start);
    }

    public async eventFailed(payload: EventFired<any>, ctx: HandlerContext, err: any): Promise<any> {
        const start = (ctx as any as AutomationContextAware).context.ts;
        duration(`event_handler.${payload.extensions.operationName}.failure`,
            Date.now() - start);
        duration(`event_handler.global`, Date.now() - start);
    }
}
