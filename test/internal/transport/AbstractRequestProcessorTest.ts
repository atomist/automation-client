import "mocha";

import * as assert from "power-assert";
import { HandleCommand } from "../../../src/HandleCommand";
import { EventFired, HandleEvent } from "../../../src/HandleEvent";
import { AutomationContextAware, HandlerContext } from "../../../src/HandlerContext";
import { HandlerResult } from "../../../src/HandlerResult";
import { dispose, registerDisposable } from "../../../src/internal/invoker/disposable";
import { CommandInvocation } from "../../../src/internal/invoker/Payload";
import { AbstractRequestProcessor } from "../../../src/internal/transport/AbstractRequestProcessor";
import { CommandIncoming, EventIncoming } from "../../../src/internal/transport/RequestProcessor";
import { AutomationContext } from "../../../src/internal/util/cls";
import { BuildableAutomationServer } from "../../../src/server/BuildableAutomationServer";
import { AutomationServerOptions } from "../../../src/server/options";
import { GraphClient } from "../../../src/spi/graph/GraphClient";
import { MessageClient } from "../../../src/spi/message/MessageClient";
import { Factory } from "../../../src/util/constructionUtils";

class ConcreteRequestProcessor extends AbstractRequestProcessor {

    public invokeCommandPlease(ci: CommandInvocation,
                               ctx: HandlerContext & AutomationContextAware,
                               command: CommandIncoming,
                               callback: (result: Promise<HandlerResult>) => void) {
        this.invokeCommand(ci, ctx, command, callback);
    }

    public invokeEventPlease(ci: EventFired<any>,
                             ctx: HandlerContext & AutomationContextAware,
                             command: EventIncoming,
                             callback: (result: Promise<HandlerResult[]>) => void) {
        this.invokeEvent(ci, ctx, command, callback);
    }

    protected sendStatusMessage(payload: any, ctx: HandlerContext & AutomationContextAware): Promise<any> {
        // it is rude for a function that returns a Promise to throw instead.
        return Promise.reject(new Error("Method not implemented: sendStatusMessage."));
    }

    protected createGraphClient(event: EventIncoming | CommandIncoming, context: AutomationContextAware): GraphClient {
        throw new Error("Method not implemented: createGraphClient.");
    }

    protected createMessageClient(event: EventIncoming | CommandIncoming, context: AutomationContextAware): MessageClient {
        throw new Error("Method not implemented: createMessageClient.");
    }

}

describe("the processCommand method", () => {
    const nothing = () => {
        // this is fine
    };

    function invokeSomething(doThis: (ctx: HandlerContext) => void = nothing,
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
            teamId: "TEAM",
            teamName: "my team",
            operation: "DoTheWave operation",
            name: "DoTheWave name",
            version: "0.3.17",
            invocationId: "invokinate",
            ts: 500625,
        };
        const context: HandlerContext & AutomationContextAware = {
            messageClient: null,
            teamId: automationContext.teamId,
            correlationId: automationContext.correlationId,
            context: automationContext,
        };

        context.lifecycle = {
            registerDisposable: registerDisposable(context),
            dispose: dispose(context),
        };

        const command: CommandIncoming = {
            rug: "DoTheWave",
            correlation_context: null,
            parameters: [],
            mapped_parameters: [],
            secrets: [],
            name: "DoTheWave",
            corrid: "abc",
            team: { id: "TEAM" },
            atomist_type: "atomist type",
        };

        return new Promise((resolve, reject) =>
            new ConcreteRequestProcessor(automationServer).invokeCommandPlease(
                commandInvocation,
                context,
                command, resultPromise => {
                    return resultPromise
                        .then(result => resolve(result))
                        .catch(error => reject(error));
                },
            ));
    }

    it("should call a command", done => {
        invokeSomething()
            .then(() => done(), done);
    });

    it("should release resources allocated during a command", done => {
        let watchMe = "begin";
        const allocateResource = (ctx: HandlerContext) => {
            ctx.lifecycle.registerDisposable(
                () => {
                    watchMe = "changed";
                    return Promise.resolve();
                }, "set watchMe to changed",
            );
        };
        invokeSomething(allocateResource)
            .then(() => {
                assert(watchMe === "changed", watchMe);
            })
            .then(() => done(), done);
    });

    it("should release resources when the command failed", done => {
        let watchMe = "begin";
        const allocateResource = (ctx: HandlerContext) => {
            ctx.lifecycle.registerDisposable(() => {
                    watchMe = "changed";
                    return Promise.resolve();
                }, "set watchMe to changed",
            );
        };
        invokeSomething(allocateResource, { code: 1, more: "I did this on purpose" })
            .then(() => {
                assert(watchMe === "changed", watchMe);
            })
            .then(() => done(), done);
    });

});

describe("the processEvent method", () => {
    const nothing = () => {
        // no really
    };

    function invokeSomething(doThis: (ctx: HandlerContext) => void = nothing,
                             handlerResult: HandlerResult & any = {
                                 code: 0,
                                 more: "stand up and say wooo",
                             }): Promise<HandlerResult> {
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
            teamId: "TEAM",
            teamName: "my team",
            operation: "DoTheWave operation",
            name: "DoTheWave name",
            version: "0.3.17",
            invocationId: "invokinate",
            ts: 500625,
        };
        const context: HandlerContext & AutomationContextAware = {
            messageClient: null,
            teamId: automationContext.teamId,
            correlationId: automationContext.correlationId,
            context: automationContext,
        };

        context.lifecycle = {
            registerDisposable: registerDisposable(context),
            dispose: dispose(context),
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

        return new Promise((resolve, reject) =>
            new ConcreteRequestProcessor(automationServer).invokeEventPlease(
                invocation,
                context,
                incoming, resultPromise => {
                    return resultPromise
                        .then(result => resolve(result[0]))
                        .catch(error => reject(error));
                },
            ));
    }

    it("should call an event handler", done => {
        let called = false;
        invokeSomething(() => {
            called = true;
        }).then(() => {
            assert(called);
        }).then(() => done(), done);
    });

    it("should release resources allocated during an event", done => {
        let watchMe = "begin";
        const allocateResource = (ctx: HandlerContext) => {
            ctx.lifecycle.registerDisposable(() => {
                    watchMe = "changed";
                    return Promise.resolve();
                }, "set watchMe to changed",
            );
        };
        invokeSomething(allocateResource)
            .then(() => {
                assert(watchMe === "changed", watchMe);
            })
            .then(() => done(), done);
    });

    it("should release resources when the event failed", done => {
        let watchMe = "begin";
        const allocateResource = (ctx: HandlerContext) => {
            ctx.lifecycle.registerDisposable(() => {
                    watchMe = "changed";
                    return Promise.resolve();
                }, "set watchMe to changed",
            );
        };
        invokeSomething(allocateResource, { code: 1, more: "I did this on purpose" })
            .then(() => {
                assert(watchMe === "changed", watchMe);
            })
            .then(() => done(), done);
    });

});
