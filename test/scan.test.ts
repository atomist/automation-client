import * as assert from "power-assert";

import { loadConfiguration } from "../lib/configuration";

describe("scan", () => {

    // This test only works when run from the IDE; with mocha the JS files are not visible
    it.skip("should find test handlers", done => {
        loadConfiguration()
            .then(configuration => {
                assert.equal(configuration.commands.length, 3);
                assert.equal(configuration.events.length, 1);
                done();
            });

    });
});
