import "mocha";

import * as assert from "power-assert";
import { GitHubRepoRef } from "../../../../src/operations/common/GitHubRepoRef";
import { GitHubTargetsParams } from "../../../../src/operations/common/params/GitHubTargetsParams";
import { MappedRepoParameters } from "../../../../src/operations/common/params/MappedRepoParameters";

describe("GitHubTargetsParams", () => {

    it("should work with single repo", () => {
        const p = new MappedRepoParameters();
        p.owner = "foo";
        p.repo = "bar";
        assert(p.repoRef.owner === p.owner);
        assert(p.repoRef.repo === p.repo);
    });

    it("should default to no single repo", () => {
        const p = new MappedRepoParameters();
        assert(!p.repoRef);
    });

    it("should apply regex: match", () => {
        const p = new MappedRepoParameters();
        p.repo = ".*";
        assert(!p.repoRef);
        assert(p.test(new GitHubRepoRef("a", "b")));
    });

    it("should apply regex: no match", () => {
        const p = new MappedRepoParameters();
        p.repo = "x.*";
        assert(!p.repoRef);
        assert(!p.test(new GitHubRepoRef("a", "b")));
        assert(p.test(new GitHubRepoRef("a", "xb")));
    });

});
