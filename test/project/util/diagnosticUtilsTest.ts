import "mocha";

import * as assert from "power-assert";
import { InMemoryProject } from "../../../src/project/mem/InMemoryProject";
import { diagnosticDump } from "../../../src/project/util/diagnosticUtils";
import { saveFromFiles } from "../../../src/project/util/projectUtils";

describe("diagnosticUtils", () => {

    it("saveFromFiles", done => {
        const p = new InMemoryProject();
        p.addFileSync("Thing", "1");
        Promise.resolve(p)
            .then(diagnosticDump("thing"))
            .then(p1 => {
                assert(p === p1);
                done();
            }).catch(done);
    });

});
