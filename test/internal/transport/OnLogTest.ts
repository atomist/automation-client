import "mocha";

import * as assert from "power-assert";
import { LogHandler } from "../../../src";
import {
    AtomistLog,
    OnLog,
} from "../../../src/internal/transport/OnLog";
import { guid } from "../../../src/internal/util/string";

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
