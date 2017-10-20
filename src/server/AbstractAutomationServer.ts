import { EventFired } from "../HandleEvent";
import { HandlerContext } from "../HandlerContext";
import { HandlerResult } from "../HandlerResult";
import { Arg, CommandInvocation } from "../internal/invoker/Payload";
import { CommandHandlerMetadata, EventHandlerMetadata, IngestorMetadata, Rugs } from "../internal/metadata/metadata";
import { AutomationServer } from "./AutomationServer";

/**
 * Support for implementing an automation server.
 */
export abstract class AbstractAutomationServer implements AutomationServer {

    public abstract rugs: Rugs;

    public invokeCommand(payload: CommandInvocation, ctx: HandlerContext): Promise<HandlerResult> {
        const h = this.validateCommandInvocation(payload);
        return this.invokeCommandHandler(payload, h, ctx);
    }

    public onEvent(payload: EventFired<any>, ctx: HandlerContext): Promise<HandlerResult[]> {
        const h = this.rugs.events.filter(eh => eh.subscriptionName === payload.extensions.operationName);
        if (!h || h.length === 0) {
            const i = this.rugs.ingestors.filter(ih => ih.route === payload.extensions.operationName);
            if (!i || i.length === 0) {
                throw new Error(`No event handler or ingestor with name '${payload.extensions.operationName}'` +
                    `: Known event handlers are [${this.rugs.events.map(e => e.name)}]`);
            } else {
                return Promise.all(i.map(eh => this.invokeIngestor(payload, eh, ctx)));
            }
        } else {
            return Promise.all(h.map(eh => this.invokeEventHandler(payload, eh, ctx)));
        }
    }

    public validateCommandInvocation(payload: CommandInvocation): CommandHandlerMetadata {
        const handler = this.rugs.commands.find(h => h.name === payload.name);
        if (!handler) {
            throw new Error(`No command handler with name '${payload.name}'` +
                `: Known command handlers are [${this.rugs.commands.map(c => c.name)}]`);
        }
        handler.parameters.forEach(p => {
            const payloadValue: Arg = payload.args ?
                payload.args.find(a => a.name === p.name) : undefined;
            if (!payloadValue || !payloadValue.value) {
                if (p.required && p.default_value === undefined) {
                    throw new Error(`Parameter '${p.name}' required but missing in invocation to '${handler.name}'`);
                }
            } else {
                // We have a parameter. Validate it
                if (p.pattern && payloadValue.value.match(new RegExp(p.pattern)) === null) {
                    throw new Error(`Parameter '${p.name}' value of '${payloadValue.value}'` +
                        ` invalid in invocation to '${handler.name}' with pattern '${p.pattern}'`);
                }
            }
        });
        return handler;
    }

    protected abstract invokeCommandHandler(payload: CommandInvocation, h: CommandHandlerMetadata,
                                            ctx: HandlerContext): Promise<HandlerResult>;

    protected abstract invokeEventHandler(payload: EventFired<any>, h: EventHandlerMetadata,
                                          ctx: HandlerContext): Promise<HandlerResult>;

    protected abstract invokeIngestor(payload: EventFired<any>, h: IngestorMetadata,
                                      ctx: HandlerContext): Promise<HandlerResult>;

}
