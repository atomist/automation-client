import "mocha";

import * as assert from "power-assert";
import { InMemoryProject } from "../../../src/project/mem/InMemoryProject";
import { doWithJson, manipulate } from "../../../src/project/util/jsonUtils";

describe("jsonUtils", () => {

    describe("manipulate", () => {

        it("should handle undefined", () => {
            assert(manipulate(undefined, o => null) === undefined);
        });

        it("should handle null", () => {
            assert(manipulate(null, o => null) === null);
        });

        it("should handle ill formed string", () => {
            const s = "not json at all";
            assert(manipulate(s, o => null) === s);
        });

        it("should handle simple number", () => {
            const json = simpleJson(25);
            const transformed = manipulate(json, o => o.y = 31);
            assert(transformed === simpleJson(31),
                "\n" + json + "\n" + transformed);
        });

        it("should handle real content", () => {
            const json = fromPackageJson("@atomist/test");
            const desired = fromPackageJson("newer");
            const transformed = manipulate(json, o => o.name = "newer");
            assert(transformed === desired,
                "\n" + json + "\n" + transformed);
        });

        it("should add structured elements to real content", () => {
            const json = fromPackageJson("@atomist/test");
            const transformed = manipulate(json,
                o => o.extras = [
                    { greg: "CEO" },
                    { nadine: "GC" },
                ]);
            assert(transformed.includes('"greg": "CEO"'));
            // Should succeed
            JSON.parse(transformed);
        });

    });

    describe("doWithJson", () => {

        it("should handle no such file", done => {
            const notJson = "bar";

            const p = InMemoryProject.of({ path: "thing.json", content: notJson });
            doWithJson(p, "not_there.json", o => null)
                .then(() => {
                    done();
                }).catch(done);
        });

        it("should handle ill formed file", done => {
            const notJson = "bar";

            const p = InMemoryProject.of({ path: "thing.json", content: notJson });

            doWithJson(p, "thing.json", o => null)
                .then(() => {
                    const transformed = p.findFileSync("thing.json").getContentSync();
                    assert(transformed === notJson);
                    done();
                }).catch(done);
        });

        it("should handle simple number", done => {
            const simple = simpleJson(25);
            const desired = simpleJson(31);
            const manipulation = o => o.y = 31;

            const p = InMemoryProject.of({ path: "thing.json", content: simple });

            doWithJson(p, "thing.json", manipulation)
                .then(() => {
                    const transformed = p.findFileSync("thing.json").getContentSync();
                    assert(transformed === desired,
                        "\n" + simple + "\n" + transformed);
                    done();
                }).catch(done);
        });
    });

});

function simpleJson(b: number) {
    return `{"x":5,"y":${b}}`;
}

function fromPackageJson(name: string) {
    return `{
  "name": "${name}",
  "version": "0.3.5",
  "description": "Atomist automation client for running command and event handlers",
  "author": "Atomist, Inc.",
  "license": "GPL-3.0",
  "homepage": "https://github.com/atomist/automation-client-ts#readme",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/atomist/automation-client-ts.git"
  },
  "keywords": [
    "atomist",
    "automation"
  ],
  "bugs": {
    "url": "https://github.com/atomist/automation-client-ts/issues"
  }
}`;
}
