
import * as assert from "power-assert";

import { InMemoryFile } from "../../../lib/project/mem/InMemoryFile";

describe("AbstractFile", () => {

    describe("extension", () => {

        it("should work with .js in root", () => {
            const f = new InMemoryFile("thing.js", "");
            assert(f.extension === "js");
        });

        it("should work with .js in directory", () => {
            const f = new InMemoryFile("test/thing.js", "");
            assert(f.extension === "js");
        });

        it("should work with .tar.gz in directory", () => {
            const f = new InMemoryFile("test/thing.tar.gz", "");
            assert(f.extension === "gz");
        });

        it("should work with none", () => {
            const f = new InMemoryFile("test/thing", "");
            assert(f.extension === "", `[${f.extension}]`);
        });
    });

});
