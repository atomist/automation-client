import * as assert from "power-assert";
import { GitHubRepoRef } from "../../../lib/operations/common/GitHubRepoRef";
import { GitCommandGitProject } from "../../../lib/project/git/GitCommandGitProject";
import { GitProject } from "../../../lib/project/git/GitProject";
import {
    CloneOptions,
    DefaultCloneOptions,
} from "../../../lib/spi/clone/DirectoryManager";
import { TmpDirectoryManager } from "../../../lib/spi/clone/tmpDirectoryManager";
import { execPromise } from "../../../lib/util/child_process";
import {
    Creds,
    ExistingRepoName,
    ExistingRepoOwner,
} from "../../credentials";

describe("CachedGitClone", () => {
    describe("even transient clones have some properties", () => {

        function cloneTransiently(opts: CloneOptions = DefaultCloneOptions): Promise<GitProject> {
            const repositoryThatExists = GitHubRepoRef.from({ owner: ExistingRepoOwner, repo: ExistingRepoName, branch: "master" });
            return GitCommandGitProject.cloned(Creds, repositoryThatExists, opts, TmpDirectoryManager);
        }

        it("clones to depth of 1 when transient", async () => {
            const clone1 = await cloneTransiently();
            const baseDir = clone1.baseDir;
            const result = await execPromise("git", ["rev-list", "HEAD"], { cwd: baseDir });
            assert(result.stdout.trim().split("\n").length === 1, result.stdout);
            await clone1.release();
        }).timeout(20000);

        it("clones fully when requested", async () => {
            const clone1 = await cloneTransiently({ alwaysDeep: true });
            const baseDir = clone1.baseDir;
            const result = await execPromise("git", ["rev-list", "HEAD"], { cwd: baseDir });
            // we can see all the commits
            assert(result.stdout.trim().split("\n").length > 1);
            const branchResult = await execPromise("git", ["rev-list", "this-tag-exists"], { cwd: baseDir });
            // now we have access to tags
            assert(branchResult.stdout.trim().split("\n").length >= 1);
            await clone1.release();
        }).timeout(20000);

        it("clones all branches when requested", async () => {
            const clone1 = await cloneTransiently({ alwaysDeep: false, noSingleBranch: true });
            const baseDir = clone1.baseDir;
            const result = await execPromise("git", ["rev-list", "origin/this-branch-exists"], { cwd: baseDir });
            // we can see exactly one sha
            assert(result.stdout.trim().length === 40);
            await clone1.release();
        }).timeout(20000);
    });

});
