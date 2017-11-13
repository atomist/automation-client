import "mocha";

import * as assert from "power-assert";

import { successOn } from "../../../src/action/ActionResult";

import { SimpleRepoId } from "../../../src/operations/common/RepoId";
import { generate } from "../../../src/operations/generate/generatorUtils";
import { InMemoryProject } from "../../../src/project/mem/InMemoryProject";

describe("generate", () => {

    it("success with no op editor and empty project", done => {
        generate(InMemoryProject.of(),
            null, null,
            p => Promise.resolve(p),
            p => Promise.resolve(successOn(p)),
            new SimpleRepoId("foo", "bar"))
            .then(r => {
                done();
            }).catch(done);
    });

});
