
import * as assert from "power-assert";
import {
    fromListRepoFinder,
    fromListRepoLoader,
} from "../../../lib/operations/common/fromProjectList";
import { InMemoryProject } from "../../../lib/project/mem/InMemoryProject";

describe("fromProjectList.ts", () => {

    describe("fromListRepoFinder", () => {

        it("should object when given undefined repo id", () => {
            const noIdProject = InMemoryProject.of();
            noIdProject.id = undefined;
            assert.throws(() => fromListRepoFinder([noIdProject]));
        });

    });

    describe("fromListRepoLoader", () => {

        it("should object when given undefined repo id", () => {
            const noIdProject = InMemoryProject.of();
            noIdProject.id = undefined;
            assert.throws(() => fromListRepoLoader([noIdProject]));
        });

    });

});
