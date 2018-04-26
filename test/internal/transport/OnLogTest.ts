import "mocha";

import * as assert from "power-assert";
import { LogHandler } from "../../../src";
import { AutomationServerOptions } from "../../../src/configuration";
import { HandleCommand } from "../../../src/HandleCommand";
import { EventFired, HandleEvent } from "../../../src/HandleEvent";
import { AutomationContextAware, HandlerContext } from "../../../src/HandlerContext";
import { HandlerResult } from "../../../src/HandlerResult";
import { dispose, registerDisposable } from "../../../src/internal/invoker/disposable";
import { CommandInvocation } from "../../../src/internal/invoker/Payload";
import { AbstractRequestProcessor } from "../../../src/internal/transport/AbstractRequestProcessor";
import {
    AtomistLog,
    OnLog,
} from "../../../src/internal/transport/OnLog";
import { CommandIncoming, EventIncoming } from "../../../src/internal/transport/RequestProcessor";
import { AutomationContext } from "../../../src/internal/util/cls";
import { guid } from "../../../src/internal/util/string";
import { BuildableAutomationServer } from "../../../src/server/BuildableAutomationServer";
import { GraphClient } from "../../../src/spi/graph/GraphClient";
import { MessageClient } from "../../../src/spi/message/MessageClient";
import { Factory } from "../../../src/util/constructionUtils";

describe("OnLog", () => {

    it("logHandler should get invoked", async () => {

        let logEvent: AtomistLog;
        const handler: LogHandler = log => {
            logEvent = log;
            return Promise.resolve();
        };

        const onLog: OnLog = new OnLog("name", "version", [handler]);
        const result = await onLog.handle({
            data: {
                AtomistLog: [{
                   level: "info",
                   message: "this is a test message",
                   correlation_context: {
                       correlation_id: guid(),
                   },
                   timestamp: Date.now(),
                }],
            },
            extensions: {
                operationName: "OnLog",
            },
        }, null);

        assert.equal(logEvent.level, "info");
        assert.equal(logEvent.message, "this is a test message");

        return result;
    });

});
