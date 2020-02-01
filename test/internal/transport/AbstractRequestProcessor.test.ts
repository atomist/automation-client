import * as assert from "power-assert";
import { AutomationServerOptions } from "../../../lib/configuration";
import { HandleCommand } from "../../../lib/HandleCommand";
import {
    EventFired,
    HandleEvent,
} from "../../../lib/HandleEvent";
import {
    AutomationContextAware,
    HandlerContext,
} from "../../../lib/HandlerContext";
import { HandlerResult } from "../../../lib/HandlerResult";
import {
    dispose,
    registerDisposable,
} from "../../../lib/internal/invoker/disposable";
import { CommandInvocation } from "../../../lib/internal/invoker/Payload";
import { AbstractRequestProcessor } from "../../../lib/internal/transport/AbstractRequestProcessor";
import {
    CommandIncoming,
    EventIncoming,
} from "../../../lib/internal/transport/RequestProcessor";
import { AutomationContext } from "../../../lib/internal/util/cls";
import { BuildableAutomationServer } from "../../../lib/server/BuildableAutomationServer";
import { GraphClient } from "../../../lib/spi/graph/GraphClient";
import { MessageClient } from "../../../lib/spi/message/MessageClient";
import { Factory } from "../../../lib/util/constructionUtils";

class ConcreteRequestProcessor extends AbstractRequestProcessor {

    public async invokeCommandPlease(ci: CommandInvocation,
                                     ctx: HandlerContext & AutomationContextAware,
                                     command: CommandIncoming): Promise<HandlerResult> {
        return this.invokeCommand(ci, ctx, command);
    }

    public async invokeEventPlease(ci: EventFired,
                                   ctx: HandlerContext & AutomationContextAware,
                                   command: EventIncoming): Promise<HandlerResult[]> {
        return this.invokeEvent(ci, ctx, command);
    }

    protected sendStatusMessage(payload: any, ctx: HandlerContext & AutomationContextAware): Promise<any> {
        // it is rude for a function that returns a Promise to throw instead.
        return Promise.reject(new Error("Method not implemented: sendStatusMessage."));
    }

    protected createGraphClient(event: EventIncoming | CommandIncoming, context: AutomationContextAware): GraphClient {
        throw new Error("Method not implemented: create.");
    }

    protected createMessageClient(event: EventIncoming | CommandIncoming, context: AutomationContextAware): MessageClient {
        throw new Error("Method not implemented: createMessageClient.");
    }

}

describe("the processCommand method", () => {
    const nothing = () => {
        // this is fine
    };

    async function invokeSomething(doThis: (ctx: HandlerContext) => void = nothing,
                                   handlerResult: HandlerResult & any = {
                                       code: 0,
                                       more: "stand up and say wooo",
                                   }): Promise<HandlerResult> {
        const automationServerOpts: AutomationServerOptions = { name: "Fred", version: "8.10.5" };
        const automationServer: BuildableAutomationServer = new BuildableAutomationServer(automationServerOpts);
        const factory: Factory<HandleCommand> = () => {
            return {
                __kind: "command-handler",
                __intent: "Yo",
                __name: "DoTheWave",
                handle: (ctx: HandlerContext, parameters: any) => {
                    doThis(ctx);
                    return Promise.resolve(handlerResult);
                },
            };
        };
        automationServer.registerCommandHandler(factory);

        const commandInvocation: CommandInvocation = { args: [], name: "DoTheWave" };
        const automationContext: AutomationContext = {
            correlationId: "abc",
            workspaceId: "TEAM",
            workspaceName: "my team",
            operation: "DoTheWave operation",
            name: "DoTheWave name",
            version: "0.3.17",
            invocationId: "invokinate",
            ts: 500625,
        };

        const command: CommandIncoming = {
            parameters: [],
            mapped_parameters: [],
            secrets: [],
            command: "DoTheWave",
            correlation_id: "abc",
            team: { id: "TEAM" },
            source: {
                user_agent: "slack",
                slack: {
                    team: { id: "TEAM" },
                },
            },
        };

        const context: HandlerContext & AutomationContextAware = {
            messageClient: undefined,
            workspaceId: automationContext.workspaceId,
            correlationId: automationContext.correlationId,
            context: automationContext,
            trigger: command,
        };

        context.lifecycle = {
            registerDisposable: registerDisposable(context),
            dispose: dispose(context),
        };

        return new ConcreteRequestProcessor(automationServer, {}).invokeCommandPlease(
            commandInvocation,
            context,
            command);
    }

    it("should call a command", async () => {
        await invokeSomething();
    });

    it("should release resources allocated during a command", async () => {
        let watchMe = "begin";
        const allocateResource = (ctx: HandlerContext) => {
            ctx.lifecycle.registerDisposable(
                () => {
                    watchMe = "changed";
                    return Promise.resolve();
                }, "set watchMe to changed",
            );
        };
        await invokeSomething(allocateResource);
        assert(watchMe === "changed", watchMe);
    });

    it("should release resources when the command failed", async () => {
        let watchMe = "begin";
        const allocateResource = (ctx: HandlerContext) => {
            ctx.lifecycle.registerDisposable(() => {
                    watchMe = "changed";
                    return Promise.resolve();
                }, "set watchMe to changed",
            );
        };
        await invokeSomething(allocateResource, { code: 1, more: "I did this on purpose" });
        assert(watchMe === "changed", watchMe);
    });

});

describe("the processEvent method", () => {
    const nothing = () => {
        // no really
    };

    async function invokeSomething(doThis: (ctx: HandlerContext) => void = nothing,
                                   handlerResult: HandlerResult & any = {
                                       code: 0,
                                       more: "stand up and say wooo",
                                   }): Promise<HandlerResult[]> {
        const automationServerOpts: AutomationServerOptions = { name: "Fred", version: "8.10.5" };
        const automationServer: BuildableAutomationServer = new BuildableAutomationServer(automationServerOpts);
        const factory: Factory<HandleEvent<any>> = () => {
            return {
                __kind: "event-handler",
                __name: "DoTheWave",
                __subscription: "query DoTheWave { Woo { stuff } }",
                handle: (e: any, ctx: HandlerContext, parameters: any) => {
                    doThis(ctx);
                    return Promise.resolve(handlerResult);
                },
            };
        };
        automationServer.registerEventHandler(factory);

        const invocation: EventFired<any> = {
            data: {},
            extensions: {
                operationName: "DoTheWave",
            },
        };
        const automationContext: AutomationContext = {
            correlationId: "abc",
            workspaceId: "TEAM",
            workspaceName: "my team",
            operation: "DoTheWave operation",
            name: "DoTheWave name",
            version: "0.3.17",
            invocationId: "invokinate",
            ts: 500625,
        };

        const incoming: EventIncoming = {
            extensions: {
                team_id: "TEAM",
                correlation_id: "abc",
                operationName: "DoTheWave",
            },
            data: {},
            secrets: [],
        };

        const context: HandlerContext & AutomationContextAware = {
            messageClient: undefined,
            workspaceId: automationContext.workspaceId,
            correlationId: automationContext.correlationId,
            context: automationContext,
            trigger: incoming,
        };

        context.lifecycle = {
            registerDisposable: registerDisposable(context),
            dispose: dispose(context),
        };

        return new ConcreteRequestProcessor(automationServer, {}).invokeEventPlease(
            invocation,
            context,
            incoming);
    }

    it("should call an event handler", async () => {
        let called = false;
        await invokeSomething(() => {
            called = true;
        });
        assert(called);
    });

    it("should release resources allocated during an event", async () => {
        let watchMe = "begin";
        const allocateResource = (ctx: HandlerContext) => {
            ctx.lifecycle.registerDisposable(() => {
                    watchMe = "changed";
                    return Promise.resolve();
                }, "set watchMe to changed",
            );
        };
        await invokeSomething(allocateResource);
        assert(watchMe === "changed", watchMe);
    });

    it("should release resources when the event failed", async () => {
        let watchMe = "begin";
        const allocateResource = (ctx: HandlerContext) => {
            ctx.lifecycle.registerDisposable(() => {
                    watchMe = "changed";
                    return Promise.resolve();
                }, "set watchMe to changed",
            );
        };
        await invokeSomething(allocateResource, { code: 1, more: "I did this on purpose" });
        assert(watchMe === "changed", watchMe);
    });

});
