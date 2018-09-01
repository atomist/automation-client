import "mocha";
import * as assert from "power-assert";
import * as WebSocket from "ws";
import { EventFired } from "../../../../src/HandleEvent";
import { HandlerContext } from "../../../../src/HandlerContext";
import { HandlerResult } from "../../../../src/HandlerResult";
import { CommandInvocation } from "../../../../src/internal/invoker/Payload";
import { Automations } from "../../../../src/internal/metadata/metadata";
import { DefaultWebSocketRequestProcessor } from "../../../../src/internal/transport/websocket/DefaultWebSocketRequestProcessor";
import { CommandHandlerMetadata } from "../../../../src/metadata/automationMetadata";
import { AutomationServer } from "../../../../src/server/AutomationServer";

describe("DefaultWebSocketRequestProcessor", () => {

    it("check event received and processed", done => {
        class MockAutomationServer implements AutomationServer {

            public automations: Automations = {
                name: "boo",
                version: "1.0.0",
                policy: "ephemeral",
                keywords: [],
                events: [],
                commands: [],
                ingesters: [],
                team_ids: ["xxx"],
            };

            public validateCommandInvocation(payload: CommandInvocation): CommandHandlerMetadata {
                throw new Error("Method not implemented.");
            }

            public invokeCommand(payload: CommandInvocation, ctx: HandlerContext): Promise<HandlerResult> {
                assert.fail();
                throw new Error("Method not implemented.");
            }

            public onEvent(payload: EventFired<any>, ctx: HandlerContext): Promise<HandlerResult[]> {
                assert(payload.extensions.operationName === "FooOp");
                assert(payload.secrets.length === 0);
                assert(payload.data.Foo.bar === 27);

                assert(ctx.workspaceId === "x-team");
                assert(ctx.correlationId === "555");
                assert(ctx.messageClient);

                return Promise.resolve([{ code: 0 }]);
            }
        }
        class MockWebSocket {
            public send(data: any, cb?: (err: Error) => void) {
                assert(JSON.parse(data).status.code === 0);
            }
        }
        const automations = new MockAutomationServer();
        const listener = new DefaultWebSocketRequestProcessor(automations,
            { token: "xxx", endpoints: {api: "http://foo.com", graphql: "http://bar.com" }, ws: {}});
        listener.onRegistration({ url: "http://bla.com", jwt: "123456789", name: "goo", version: "1.0.0" });
        listener.onConnect((new MockWebSocket() as any) as WebSocket);
        listener.processEvent({
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
            },
        }, () => done());

    }).timeout(5000);

    it("check successful command received and processed", done => {
        verifyCommandHandler(0, () => done());
    }).timeout(5000);

    it("check unsuccessful command received and processed", done => {
        verifyCommandHandler(1, () => done());
    }).timeout(5000);
});

function verifyCommandHandler(code: number, callback: (result) => void) {
    class MockAutomationServer implements AutomationServer {

        public automations: Automations = {
            name: "foo",
            version: "1.0.0",
            policy: "ephemeral",
            events: [],
            commands: [],
            ingesters: [],
            team_ids: ["x-team"],
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

            assert(ctx.workspaceId === "x-team");
            assert(ctx.correlationId === "555");
            assert(ctx.messageClient);

            return Promise.resolve({ code });
        }

        public onEvent(payload: EventFired<any>, ctx: HandlerContext): Promise<HandlerResult[]> {
            assert.fail();
            throw new Error("Method not implemented.");
        }
    }
    class MockWebSocket {
        public send(data: any, cb?: (err: Error) => void) {
            assert(JSON.parse(data).status.code === code);
        }
    }
    const automations = new MockAutomationServer();
    const listener = new DefaultWebSocketRequestProcessor(automations,
        { token: "xxx", endpoints: {api: "http://foo.com", graphql: "http://bar.com" }, ws: {}});
    listener.onRegistration({ url: "http://bla.com", jwt: "123456789", name: "goo", version: "1.0.0" });
    listener.onConnect((new MockWebSocket() as any) as WebSocket);
    listener.processCommand({
        secrets: [],
        mapped_parameters: [],
        command: "FooOp",
        parameters: [
            { name: "foo", value: "bar" },
        ],
        correlation_id: "555",
        team: {
            id: "x-team",
            name: "atomista",
        },
        source: {
            user_agent: "slack",
            slack: {
                team: {
                    id: "x-team",
                },
            },
        },
    }, callback);

}
