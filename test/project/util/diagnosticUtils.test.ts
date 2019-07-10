
import * as assert from "power-assert";
import { InMemoryProject } from "../../../lib/project/mem/InMemoryProject";
import { diagnosticDump } from "../../../lib/project/util/diagnosticUtils";
import { gatherFromFiles } from "../../../lib/project/util/projectUtils";

describe("diagnosticUtils", () => {

    it("gatherFromFiles", done => {
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
