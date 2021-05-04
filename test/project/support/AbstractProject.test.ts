import * as assert from "assert";
import { GitHubRepoRef } from "../../../lib/operations/common/GitHubRepoRef";
import { GitCommandGitProject } from "../../../lib/project/git/GitCommandGitProject";
import { spawnPromise } from "../../../lib/util/child_process";

describe("AbstractProject", () => {

    describe("globMatchesWithin", () => {

        it.skip("should match ts pattern in nested folder", async () => {
            const patterns = [
                "*.{d.ts,js,ts}{,.map}",
                "!(node_modules)/**/*.{d.ts,js,ts}{,.map}",
                "lib/typings/types.ts",
                "git-info.json",
            ];

            const p = await GitCommandGitProject.cloned(undefined, GitHubRepoRef.from({
                owner: "atomist",
                repo: "yaml-updater",
            } as any));

            await spawnPromise("npm", ["ci"], { cwd: p.baseDir });

            const matches = await p.getFiles(patterns);

            assert(matches.length > 1);
            assert(!matches.some(m => m.path.startsWith("node_modules")));

        }).timeout(20000);

    });

});
