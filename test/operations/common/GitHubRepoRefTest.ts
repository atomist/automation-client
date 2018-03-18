import "mocha";

import * as assert from "power-assert";

import { GitHubDotComBase, GitHubRepoRef } from "../../../src/operations/common/GitHubRepoRef";

describe("GitHubRepoRef", () => {

    it("defaults apiBase correctly", () => {
        const gh = new GitHubRepoRef("owner", "repo");
        assert(gh.apiBase === GitHubDotComBase);
    });

    it("takes new apiBase correctly", () => {
        const apiBase = "https//somewhere.com";
        const gh = new GitHubRepoRef("owner", "repo", undefined, apiBase);
        assert(gh.apiBase === apiBase);
    });

    it("strips new apiBase trailing / correctly", () => {
        const apiBase = "https//somewhere.com";
        const gh = new GitHubRepoRef("owner", "repo", undefined, apiBase + "/");
        assert(gh.apiBase === apiBase);
    });

    it("puts the branch in the sha if sha is not provided", () => {
        // this is to replicate the behavior when branch wasn't an option
        const gh = GitHubRepoRef.from({owner: "owner", repo: "repo", branch: "fester"});
        assert.equal(gh.sha, "fester");
    });

    it("does not let you provide a sha that is not a sha, when you could put that in branch", () => {
        assert.throws(() => GitHubRepoRef.from({owner: "owner", repo: "repo", sha: "fester"}));
    });

});
