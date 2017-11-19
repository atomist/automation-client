import "mocha";

import * as assert from "power-assert";
import { GitHubRepoRef } from "../../../src/operations/common/GitHubRepoRef";
import { GitCommandGitProject } from "../../../src/project/git/GitCommandGitProject";
import { GitProject } from "../../../src/project/git/GitProject";
import { Project } from "../../../src/project/Project";
import { TmpDirectoryManager } from "../../../src/spi/clone/tmpDirectoryManager";
import { GitHubToken } from "../../atomist.config";

const TargetOwner = "atomist-travisorg";
const ExistingRepo = "this-repository-exists";

const ExistingRepoRef = new GitHubRepoRef(TargetOwner, ExistingRepo);

const Creds = { token: GitHubToken };

describe("git status analysis", () => {

    function freshClone(): Promise<GitCommandGitProject> {
        return GitCommandGitProject.cloned(Creds, ExistingRepoRef, {}, TmpDirectoryManager)
    }

    it("should recognize a clean repository as clean", done => {
        freshClone()
            .then(project =>
                project.gitStatus())
            .then(status => {
                assert(status.isClean);
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
            })
            .then(done, done);
    }).timeout(5000);

    it("should recognize ignored files as not clean", done => {
        freshClone()
            .then(project =>
                project.addFile("ignored-file", "this file is gonna be ignored"))
            .then(project =>
                project.gitStatus())
            .then(status => {
                assert(!status.isClean);
            })
            .then(done, done);
    }).timeout(5000);

    it("should tell me the local sha", done => {
        function makeACommit(project: GitCommandGitProject): Promise<GitCommandGitProject> {
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
        function makeACommit(project: GitCommandGitProject): Promise<GitCommandGitProject> {
            return project.addFile("file-that-does-not-yet-exist", "something")
                .then(p => p.commit("yassss"))
                .then(result => result.target);
        }

        freshClone()
            .then(project =>
                project.gitStatus()
                    .then(status1 => {
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

    // I didn't figure out how to test the branch name independently. It's tested in CachedGitCloneTest

});
