import "mocha";
import * as assert from "power-assert";
import { fromListRepoFinder } from "../../../src/operations/common/fromProjectList";
import { SimpleRepoId } from "../../../src/operations/common/RepoId";
import { RepoLoader } from "../../../src/operations/common/repoLoader";
import { doWithAllRepos } from "../../../src/operations/common/repoUtils";
import { InMemoryProject } from "../../../src/project/mem/InMemoryProject";
import { Project } from "../../../src/project/Project";

describe("doWithAllRepos", () => {

    it("should work with no repos without error", done => {
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
                done();
            });
    });

    it("should skip over failing repos without error", done => {
        const good = new InMemoryProject(new SimpleRepoId("org", "good"));
        const bad = new InMemoryProject(new SimpleRepoId("org", "bad"));
        const redeemed = new InMemoryProject(new SimpleRepoId("org", "redeemed"));
        const noRepos = fromListRepoFinder([
            good, bad, redeemed,
        ]);
        let loadCount = 0;
        const blowUpLoader: RepoLoader = id => {
            ++loadCount;
            switch (id.repo) {
                case "good" :
                    return Promise.resolve(good);
                case "bad" :
                    return Promise.reject("error");
                case "redeemed" :
                    return Promise.resolve(redeemed);
            }
        };
        doWithAllRepos<Project, Project>(null, null,
            p => {
                assert(p.id.repo === "good" || p.id.repo === "redeemed");
                return Promise.resolve(p);
            }, null,
            noRepos, () => true, blowUpLoader)
            .then(results => {
                assert(results.length === 2);
                assert.deepEqual(results, [good, redeemed]);
                assert(loadCount === 3);
                done();
            })
            .catch(done);
    });

});
