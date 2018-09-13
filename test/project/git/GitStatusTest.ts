import * as stringify from "json-stringify-safe";
import "mocha";
import * as assert from "power-assert";

import { GitHubRepoRef } from "../../../lib/operations/common/GitHubRepoRef";
import { GitCommandGitProject } from "../../../lib/project/git/GitCommandGitProject";
import { GitProject } from "../../../lib/project/git/GitProject";
import { isFullyClean } from "../../../lib/project/git/gitStatus";
import { TmpDirectoryManager } from "../../../lib/spi/clone/tmpDirectoryManager";
import { GitHubToken } from "../../credentials";

const TargetOwner = "atomist-travisorg";
const ExistingRepo = "this-repository-exists";
const ExistingSha = "68ffbfaa4b6ddeff563541b4b08d3b53060a51d8";

const ExistingRepoRef = new GitHubRepoRef(TargetOwner, ExistingRepo);

const Creds = { token: GitHubToken };

describe("GitStatus", () => {

    function freshClone(repoRef: GitHubRepoRef = ExistingRepoRef): Promise<GitProject> {
        return GitCommandGitProject.cloned(Creds, repoRef, {}, TmpDirectoryManager);
    }

    it("should recognize a clean repository as clean", async () => {
        const project = await freshClone();
        const status = await project.gitStatus();
        assert(status.isClean, "full: " + status.raw);
        assert(isFullyClean(status));
        await project.release();
    }).timeout(5000);

    it("should recognize a dirty project as not clean", async () => {
        const project = await freshClone();
        await project.addFile("stuff", "oh yeah");
        const status = await project.gitStatus();
        assert(!status.isClean);
        assert(status.ignoredChanges.length === 0);
        await project.release();
    }).timeout(5000);

    it("should recognize ignored files, but still call it clean", async () => {
        const project = await freshClone();
        await project.addFile("ignored-file", "this file is gonna be ignored");
        const status = await project.gitStatus();
        assert(status.isClean);
        assert(status.raw === "!! ignored-file\n", status.raw);
        assert.deepEqual(status.ignoredChanges, ["ignored-file"], stringify(status.ignoredChanges));
        await project.release();
    }).timeout(5000);

    async function makeACommit(project: GitProject): Promise<GitProject> {
        const p = await project.addFile("file-that-does-not-yet-exist", "something");
        return p.commit("yassss");
    }

    it("should tell me the local sha", async () => {
        const project = await freshClone();
        const status1 = await project.gitStatus();
        await makeACommit(project);
        const status2 = await project.gitStatus();
        assert(status2.sha !== status1.sha, `${status1.sha}, after: ${status2.sha}`);
        await project.release();
    }).timeout(5000);

    it("should tell me the upstream sha", async () => {
        const project = await freshClone();
        const status1 = await project.gitStatus();
        assert(status1.upstream.branch === "origin/master", `upstream: ${status1.upstream.branch}`);
        assert(status1.upstream.inSync, "should be in sync to start with");
        await makeACommit(project);
        const status2 = await project.gitStatus();
        assert(!status2.upstream.inSync, `should not be in sync with ${status1.upstream.branch}`);
        await project.release();
    }).timeout(5000);

    it("should work in detached HEAD", async () => {
        const project = await freshClone(new GitHubRepoRef(TargetOwner, ExistingRepo, ExistingSha));
        const status1 = await project.gitStatus();
        assert(status1.sha === ExistingSha, `asked for ${ExistingSha}, got ${status1.sha}`);
        await project.release();
    }).timeout(5000);

    // I didn't figure out how to test the branch name independently. It's tested in CachedGitCloneTest

});
