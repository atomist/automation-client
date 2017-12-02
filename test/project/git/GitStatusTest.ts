import "mocha";

import stringify = require("json-stringify-safe");
import * as assert from "power-assert";
import { GitHubRepoRef } from "../../../src/operations/common/GitHubRepoRef";
import { GitCommandGitProject } from "../../../src/project/git/GitCommandGitProject";
import { GitProject } from "../../../src/project/git/GitProject";
import { isFullyClean } from "../../../src/project/git/gitStatus";
import { TmpDirectoryManager } from "../../../src/spi/clone/tmpDirectoryManager";
import { GitHubToken } from "../../atomist.config";

const TargetOwner = "atomist-travisorg";
const ExistingRepo = "this-repository-exists";
const ExistingSha = "68ffbfaa4b6ddeff563541b4b08d3b53060a51d8";

const ExistingRepoRef = new GitHubRepoRef(TargetOwner, ExistingRepo);

const Creds = { token: GitHubToken };

describe("git status analysis", () => {

    function freshClone(repoRef: GitHubRepoRef = ExistingRepoRef): Promise<GitProject> {
        return GitCommandGitProject.cloned({} as HandlerContext, Creds, repoRef, {}, TmpDirectoryManager);
    }

    it("should recognize a clean repository as clean", done => {
        freshClone()
            .then(project =>
                project.gitStatus())
            .then(status => {
                assert(status.isClean, "full: " + status.raw);
                assert(isFullyClean(status));
            })
            .then(done, done);
    }).timeout(5000);

    it("should recognize a dirty project as not clean", done => {
        freshClone()
            .then(project =>
                project.addFile("stuff", "oh yeah"))
            .then(project =>
                project.gitStatus())
            .then(status => {
                assert(!status.isClean);
                assert(status.ignoredChanges.length === 0);
            })
            .then(done, done);
    }).timeout(5000);

    it("should recognize ignored files, but still call it clean", done => {
        freshClone()
            .then(project =>
                project.addFile("ignored-file", "this file is gonna be ignored"))
            .then(project =>
                project.gitStatus())
            .then(status => {
                assert(status.isClean);
                assert(status.raw === "!! ignored-file\n", status.raw);
                assert.deepEqual(status.ignoredChanges, ["ignored-file"], stringify(status.ignoredChanges));
            })
            .then(done, done);
    }).timeout(5000);

    it("should tell me the local sha", done => {
        function makeACommit(project: GitProject): Promise<GitProject> {
            return project.addFile("file-that-does-not-yet-exist", "something")
                .then(p => p.commit("yassss"))
                .then(result => result.target);
        }

        freshClone()
            .then(project =>
                project.gitStatus()
                    .then(status1 => makeACommit(project)
                        .then(() => project.gitStatus()
                            .then(status2 => {
                                assert(status2.sha !== status1.sha,
                                    `${status1.sha}, after: ${status2.sha}`);
                                return project.release();
                            }))))
            .then(done, done);

    }).timeout(5000);

    it("should tell me the upstream sha", done => {
        function makeACommit(project: GitProject): Promise<GitProject> {
            return project.addFile("file-that-does-not-yet-exist", "something")
                .then(p => p.commit("yassss"))
                .then(result => result.target);
        }

        freshClone()
            .then(project =>
                project.gitStatus()
                    .then(status1 => {
                        assert(status1.upstream.branch === "origin/master",
                            `upstream: ${status1.upstream.branch}`);
                        assert(status1.upstream.inSync, "should be in sync to start with");
                        return makeACommit(project)
                            .then(() => project.gitStatus()
                                .then(status2 => {
                                    assert(!status2.upstream.inSync,
                                        `should not be in sync with ${status1.upstream.branch}`);
                                    return project.release();
                                }));
                    }))
            .then(done, done);

    }).timeout(5000);

    it("should work in detached HEAD", done => {

        freshClone(new GitHubRepoRef(TargetOwner, ExistingRepo, ExistingSha))
            .then(project =>
                project.gitStatus()
                    .then(status1 => {
                        assert(status1.sha === ExistingSha,
                            `asked for ${ExistingSha}, got ${status1.sha}`);
                    }))
            .then(() => done(), done);

    }).timeout(5000);

    // I didn't figure out how to test the branch name independently. It's tested in CachedGitCloneTest

});
