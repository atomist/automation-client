import "mocha";
import * as assert from "power-assert";
import { fromListRepoFinder } from "../../../src/operations/common/fromProjectList";
import { RepoLoader } from "../../../src/operations/common/repoLoader";
import { doWithAllRepos } from "../../../src/operations/common/repoUtils";

describe("doWithAllRepos", () => {

    it("should work with no repos without error", () => {
        const noRepos = fromListRepoFinder([]);
        const blowUpLoader: RepoLoader = () => {
            throw new Error();
        };
        doWithAllRepos(null, null,
            p => {
                throw new Error();
            }, null,
            noRepos, () => true, blowUpLoader)
            .then(results => {
                assert(results.length === 0);
            });
    });

});
