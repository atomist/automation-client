import * as assert from "power-assert";
import { fromListRepoFinder } from "../../../lib/operations/common/fromProjectList";
import { GitHubRepoRef } from "../../../lib/operations/common/GitHubRepoRef";
import { RepoFilter } from "../../../lib/operations/common/repoFilter";
import {
    RepoId,
    RepoRef,
} from "../../../lib/operations/common/RepoId";
import { RepoLoader } from "../../../lib/operations/common/repoLoader";
import { doWithAllRepos } from "../../../lib/operations/common/repoUtils";
import { InMemoryProject } from "../../../lib/project/mem/InMemoryProject";
import { Project } from "../../../lib/project/Project";

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
            }).catch(done);
    });

    it("should skip over filtered repos without error", done => {
        const good = new InMemoryProject(new GitHubRepoRef("org", "good"));
        const bad = new InMemoryProject(new GitHubRepoRef("org", "bad"));
        const redeemed = new InMemoryProject(new GitHubRepoRef("org", "redeemed"));
        const threeRepos = fromListRepoFinder([
            good, bad, redeemed,
        ]);

        const notBadFilter: RepoFilter = (r: RepoId) => {
            return r.repo !== "bad";
        };

        const dontBotherRepoLoader: RepoLoader = (r: RepoRef) => {
            return Promise.resolve({ id: r } as Project);
        };

        doWithAllRepos(null, null,
            p => {
                assert(p.id.repo === "good" || p.id.repo === "redeemed");
                return Promise.resolve(p);
            }, null,
            threeRepos, notBadFilter, dontBotherRepoLoader)
            .then(results => {
                assert(results.length === 2, `Got ${results.length} results`);
                done();
            }).catch(done);
    });

    it("should skip over failing repos without error", done => {
        const good = new InMemoryProject(new GitHubRepoRef("org", "good"));
        const bad = new InMemoryProject(new GitHubRepoRef("org", "bad"));
        const redeemed = new InMemoryProject(new GitHubRepoRef("org", "redeemed"));
        const noRepos = fromListRepoFinder([
            good, bad, redeemed,
        ]);
        let loadCount = 0;
        const blowUpLoader: RepoLoader = id => {
            ++loadCount;
            switch (id.repo) {
                case "good":
                    return Promise.resolve(good);
                case "bad":
                    return Promise.reject("error");
                case "redeemed":
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
