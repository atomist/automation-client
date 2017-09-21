import "mocha";
import { fail } from "power-assert";
import * as assert from "power-assert";
import * as WebSocket from "ws";
import { EventFired } from "../../../../src/HandleEvent";
import { HandlerContext } from "../../../../src/HandlerContext";
import { HandlerResult } from "../../../../src/HandlerResult";
import { CommandInvocation } from "../../../../src/internal/invoker/Payload";
import { CommandHandlerMetadata, Rugs } from "../../../../src/internal/metadata/metadata";
import {
    DefaultWebSocketAutomationEventListener,
} from "../../../../src/internal/transport/websocket/DefaultWebSocketAutomationEventListener";
import { WebSocketEventMessageClient } from "../../../../src/internal/transport/websocket/WebSocketMessageClient";
import { guid } from "../../../../src/internal/util/string";
import { AutomationServer } from "../../../../src/server/AutomationServer";

describe("WebSocketMessageClient", () => {

    it("verify respond is not allowed from event handlers", done => {
        const client = new WebSocketEventMessageClient(
            {
                data: {},
                extensions: { team_id: "Txxxxxxx", correlation_id: guid(), operationName: "Foor"},
                secrets: [],
            }, null, null);
        client.respond("Some test message")
            .catch(err => {
                assert(err.message === "Response messages are not supported for event handlers");
                done();
            });

    }).timeout(5000);

});
