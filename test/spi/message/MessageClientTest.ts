import "mocha";
import * as assert from "power-assert";
import {
    commandName,
    mergeParameters,
} from "../../../src/spi/message/MessageClient";
import { HelloWorld } from "../../command/HelloWorld";
import { PlainHelloWorld } from "../../command/PlainHelloWorld";

describe("MessageClient", () => {

    describe("commandName", () => {

        it("extract commandName from string", () => {
            assert.equal(commandName("HelloWorld"), "HelloWorld");
        });

        it("extract commandName from command handler instance", () => {
            assert.equal(commandName(new HelloWorld()), "HelloWorld");
        });

        it("extract commandName from plain command handler instance", () => {
            assert.equal(commandName(new PlainHelloWorld()), "PlainHelloWorld");
        });

        it("extract commandName from command handler constructor", () => {
            assert.equal(commandName(HelloWorld), "HelloWorld");
        });

        it("extract commandName from plain command handler constructor", () => {
            assert.equal(commandName(PlainHelloWorld), "PlainHelloWorld");
        });
    });

    describe("mergeParameters", () => {

        it("don't extract parameters from string", () => {
            assert.deepEqual(mergeParameters("HelloWorld", {}), {});
        });

        it("don't extract parameters from constuctor", () => {
            assert.deepEqual(mergeParameters(HelloWorld, {}), {});
        });

        it("extract parameters from instance", () => {
            const handler = new HelloWorld();
            handler.name = "cd";
            handler.userToken = "token_bla";
            assert.deepEqual(mergeParameters(handler, {}), { name: "cd", userToken: "token_bla" });
        });

        it("overwrite parameters from instance with explicit parameters", () => {
            const handler = new HelloWorld();
            handler.name = "cd";
            handler.userToken = "token_bla";
            assert.deepEqual(mergeParameters(handler, { name: "dd" }),
                { name: "dd", userToken: "token_bla" });
        });
    });

});
