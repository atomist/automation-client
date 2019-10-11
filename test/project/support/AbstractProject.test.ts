import * as assert from "assert";
import { GitHubRepoRef } from "../../../lib/operations/common/GitHubRepoRef";
import { GitCommandGitProject } from "../../../lib/project/git/GitCommandGitProject";
import { globMatchesWithin } from "../../../lib/project/support/AbstractProject";

describe("AbstractProject", () => {

    describe("globMatchesWithin", () => {

        it("should match ts pattern in nested folder", async () => {
            const patterns = [
                "*.{d.ts,js,ts}{,.map}",
                "!(node_modules)/**/*.{d.ts,js}{,.map}",
                "lib/typings/types.ts",
                "git-info.json",
            ];

            const p = await GitCommandGitProject.cloned(undefined, GitHubRepoRef.from({
                owner: "atomist",
                repo: "sdm-pack-build",
            } as any));

            const matches = await p.getFiles(patterns);
            assert(matches.length > 1);
        });

    });

});
