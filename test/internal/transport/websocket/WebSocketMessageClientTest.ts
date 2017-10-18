import "mocha";
import * as assert from "power-assert";
import {
    clean,
    WebSocketEventMessageClient
} from "../../../../src/internal/transport/websocket/WebSocketMessageClient";
import { guid } from "../../../../src/internal/util/string";

describe("WebSocketMessageClient", () => {

    it("respond is not allowed from event handlers", done => {
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

    it("correctly clean up addresses", () => {
        assert(clean("test")[0] === "test");
        assert(clean(["test"])[0] === "test");
        assert(clean([""]).length === 0);
    });

});
