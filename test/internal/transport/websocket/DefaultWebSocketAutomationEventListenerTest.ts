import "mocha";
import * as assert from "power-assert";
import { fail } from "power-assert";
import * as WebSocket from "ws";
import { EventFired } from "../../../../src/HandleEvent";
import { HandlerContext } from "../../../../src/HandlerContext";
import { HandlerResult } from "../../../../src/HandlerResult";
import { CommandInvocation } from "../../../../src/internal/invoker/Payload";
import { CommandHandlerMetadata, Rugs } from "../../../../src/internal/metadata/metadata";
import {
    DefaultWebSocketAutomationEventListener,
} from "../../../../src/internal/transport/websocket/DefaultWebSocketAutomationEventListener";
import { AutomationServer } from "../../../../src/server/AutomationServer";

describe("DefaultWebSocketAutomationEventListenerTest", () => {

    it("check event received and processed", done => {
        class MockAutomationServer implements AutomationServer {

            public rugs: Rugs;

            public validateCommandInvocation(payload: CommandInvocation): CommandHandlerMetadata {
                throw new Error("Method not implemented.");
            }

            public invokeCommand(payload: CommandInvocation, ctx: HandlerContext): Promise<HandlerResult> {
                fail();
                throw new Error("Method not implemented.");
            }

            public onEvent(payload: EventFired<any>, ctx: HandlerContext): Promise<HandlerResult[]> {
                assert(payload.extensions.operationName === "FooOp");
                assert(payload.secrets.length === 0);
                assert(payload.data.Foo.bar === 27);

                assert(ctx.teamId === "x-team");
                assert(ctx.correlationId === "555");
                assert(ctx.messageClient);

                return Promise.resolve([{code: 0}]);
            }
        }
        class MockWebSocket {
            public send(data: any, cb?: (err: Error) => void) {
                fail();
            }
        }
        const automations = new MockAutomationServer();
        const listener = new DefaultWebSocketAutomationEventListener(automations,
            { token: "xxx" , registrationUrl: "http://foo.com", graphUrl: "http://bar.com"});
        listener.onRegistration({url: "http://bla.com", jwt: "123456789" });
        listener.onConnection((new MockWebSocket() as any) as WebSocket);
        listener.onEvent({
            data: {
                Foo: {
                    bar: 27,
                },
            },
            secrets: [],
            extensions: {
                operationName: "FooOp",
                team_id: "x-team",
                correlation_id: "555",
            }}).then(_ => done());

    }).timeout(5000);

    it("check successful command received and processed", done => {
        verifyCommandHandler(0)
            .then(_ => done())
            .catch(err => console.log(err));

    }).timeout(5000);

    it("check unsuccessful command received and processed", done => {
        verifyCommandHandler(1)
            .then(_ => done())
            .catch(err => console.log(err));

    }).timeout(5000);
});

function verifyCommandHandler(code: number): Promise<HandlerResult> {
    class MockAutomationServer implements AutomationServer {

        public rugs: Rugs = {
            name: "foo",
            version: "1.0.0",
            events: [],
            commands: [],
            ingestors: [],
            team_id: "x-team",
            keywords: [],
        };

        public validateCommandInvocation(payload: CommandInvocation): CommandHandlerMetadata {
            throw new Error("Method not implemented.");
        }

        public invokeCommand(payload: CommandInvocation, ctx: HandlerContext): Promise<HandlerResult> {
            assert(payload.name === "FooOp");
            assert(payload.secrets.length === 0);
            assert(payload.args[0].name === "foo");
            assert(payload.args[0].value === "bar");

            assert(ctx.teamId === "x-team");
            assert(ctx.correlationId === "555");
            assert(ctx.messageClient);

            return Promise.resolve({ code});
        }

        public onEvent(payload: EventFired<any>, ctx: HandlerContext): Promise<HandlerResult[]> {
            fail();
            throw new Error("Method not implemented.");
        }
    }
    class MockWebSocket {
        public send(data: any, cb?: (err: Error) => void) {
            assert(JSON.parse(JSON.parse(data).message).code === code);
        }
    }
    const automations = new MockAutomationServer();
    const listener = new DefaultWebSocketAutomationEventListener(automations,
        { token: "xxx" , registrationUrl: "http://foo.com", graphUrl: "http://bar.com"});
    listener.onRegistration({url: "http://bla.com", jwt: "123456789" });
    listener.onConnection((new MockWebSocket() as any) as WebSocket);
    return listener.onCommand({
        secrets: [],
        mapped_parameters: [],
        name: "FooOp",
        parameters: [
            { name: "foo", value: "bar"},
        ],
        rug: {

        },
        correlation_context: {},
        corrid: "555",
        team: {
            owner: "atomisthqa",
            id: "x-team",
            name: "atomista",
            provider: {
                api_url: "",
                id: "",
            },
        },
        atomist_type: "command_handler_request",
    });

}
