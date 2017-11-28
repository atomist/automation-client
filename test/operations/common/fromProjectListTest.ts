
import "mocha";

import * as assert from "power-assert";
import { fromListRepoFinder, fromListRepoLoader } from "../../../src/operations/common/fromProjectList";
import { InMemoryProject } from "../../../src/project/mem/InMemoryProject";

describe("fromProjectList.ts", () => {

    describe("fromListRepoFinder", () => {

        it("should object when given undefined repo id", () => {
            const noIdProject = InMemoryProject.of();
            assert.throws(() => fromListRepoFinder([noIdProject]));
        });

    });

    describe("fromListRepoLoader", () => {

        it("should object when given undefined repo id", () => {
            const noIdProject = InMemoryProject.of();
            assert.throws(() => fromListRepoLoader([noIdProject]));
        });

    });

});
