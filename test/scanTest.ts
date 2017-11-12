import "mocha";
import * as assert from "power-assert";

import { findConfiguration } from "../src/configuration";

describe("scan", () => {

    // This test only works when run from the IDE; with mocha the JS files are not visible
    it.skip("should find test handlers", () => {
       findConfiguration()
           .then(configuration => {
               assert(configuration.commands.length === 3);
               assert(configuration.events.length === 1);
           });
    });
});
