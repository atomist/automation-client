import "mocha";

import * as assert from "power-assert";
import { commandName } from "../../../src/spi/message/MessageClient";
import { HelloWorld } from "../../command/HelloWorld";
import { PlainHelloWorld } from "../../command/PlainHelloWorld";

describe("MessageClient", () => {

    it("extract commandName from string", () => {
        assert(commandName("HelloWorld") === "HelloWorld");
    });

    it("extract commandName from command handler instance", () => {
        assert(commandName(new HelloWorld()) === "HelloWorld");
    });

    it("extract commandName from plain command handler instance", () => {
        assert(commandName(new PlainHelloWorld()) === "PlainHelloWorld");
    });

    it("extract commandName from command handler constructor", () => {
        assert(commandName(HelloWorld) === "HelloWorld");
    });

    it("extract commandName from plain command handler constructor", () => {
        assert(commandName(PlainHelloWorld) === "PlainHelloWorld");
    });

});
