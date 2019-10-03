import * as fs from "fs-extra";
import * as path from "path";
import * as assert from "power-assert";

import { getCounter } from "../../../lib/internal/util/metric";
import { guid } from "../../../lib/internal/util/string";
import { GitHubRepoRef } from "../../../lib/operations/common/GitHubRepoRef";
import { GitCommandGitProject } from "../../../lib/project/git/GitCommandGitProject";
import { GitProject } from "../../../lib/project/git/GitProject";
import { isFullyClean } from "../../../lib/project/git/gitStatus";
import {
    CachingDirectoryManager,
    FallbackKey,
    ReuseKey,
} from "../../../lib/spi/clone/CachingDirectoryManager";
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
    ExistingRepoRef,
} from "../../credentials";

describe("CachedGitClone", () => {

    function reuseKey(repo: string): string {
        return `${ReuseKey}.${ExistingRepoOwner}/${repo}`;
    }

    function fallbackKey(repo: string): string {
        return `${FallbackKey}.${ExistingRepoOwner}/${repo}`;
    }

    describe("cached git clone projects", () => {

        const getAClone = (opts: { branch?: string, repoName?: string, token?: string } = {}) => {
            const repoName = opts.repoName || ExistingRepoName;
            const repositoryThatExists =
                opts.branch ? GitHubRepoRef.from({
                    owner: ExistingRepoOwner,
                    repo: repoName,
                    branch: opts.branch,
                }) : new GitHubRepoRef(ExistingRepoOwner, repoName);
            const creds = opts.token ? { token: opts.token } : Creds;
            return GitCommandGitProject.cloned(creds, repositoryThatExists, DefaultCloneOptions, CachingDirectoryManager);
        };

        it("never returns the same place on the filesystem twice at once", done => {
            const clones = [getAClone(), getAClone()];
            const reusedBefore = getCounter(fallbackKey(ExistingRepoName)).printObj().count;
            const cleaningDone = (err: Error | void) => {
                return Promise.all(clones)
                    .then(them =>
                        them.forEach(clone => clone.release()))
                    .then(() => done(err));
            };

            Promise.all(clones)
                .then(them => {
                    assert(them[0].baseDir !== them[1].baseDir,
                        "Oh no! two simultaneous projects in " + them[0].baseDir);
                })
                .then(() => {
                    const reusedAfter = getCounter(fallbackKey(ExistingRepoName)).printObj().count;
                    // we fell back to transient at least once
                    assert(reusedBefore < reusedAfter, `${reusedBefore} < ${reusedAfter}`);
                })
                .then(cleaningDone, cleaningDone);
        }).timeout(20000);

        it("returns the same place on the filesystem in sequence", done => {
            getAClone({ repoName: "this-repository-exists-to-test-cached-clones" }).then(clone1 => {
                const baseDir1 = clone1.baseDir;
                return clone1.release()
                    .then(() => getAClone({ repoName: "this-repository-exists-to-test-cached-clones" }))
                    .then(clone2 => {
                        assert(baseDir1 === clone2.baseDir,
                            `one is in ${baseDir1}, other is in ${clone2.baseDir}`);
                        return clone2.release();
                    });
            }).then(done, done);
        }).timeout(20000);

        it("uses a new token the second time", async () => {
            const repoName = "this-repository-exists-to-test-cached-clones-6";
            const clone1 = await getAClone({ repoName });
            const baseDir1 = clone1.baseDir;
            await clone1.release();
            const clone2 = await getAClone({ repoName, token: "NOT-THE-SAME-YO" });
            await clone2.createBranch("new-token-test-branch-" + guid());
            try {
                await clone2.push();
                assert.fail("that shouldn't work with an invalid token");
            } catch (e) {
                assert(e.message.includes("Authentication failed for"));
            }
            await clone2.release();
        }).timeout(20000);

        it("should be clean when you get the directory again", done => {
            const repoName = "this-repository-exists-to-test-cached-clones-4";
            getAClone({ repoName })
                .then(project => project.addFile("stuff", "yeah"))
                .then(project => project.addFile("ignored-file", "delete this too yo"))
                .then(project => project.findFile("README.md")
                    .then(file => file.setContent("This is something different"))
                    .then(() => project))
                .then(clone1 => clone1.release()
                    .then(() => getAClone({ repoName }))
                    .then(clone2 =>
                        clone2.gitStatus()
                            .then(status => {
                                assert(clone2.baseDir === clone1.baseDir,
                                    "this test is pointless if not in the same spot");
                                assert(isFullyClean(status), status.raw);
                                return clone2.release();
                            })))
                .then(done, done);
        }).timeout(20000);

        it("should be on the correct branch when you get the directory again", done => {
            const repoName = "this-repository-exists-to-test-cached-clones-3";
            const reusedBefore = getCounter(reuseKey(repoName)).printObj().count;
            getAClone({ branch: "some-branch", repoName })
                .then(clone1 =>
                    clone1.gitStatus().then(status1 => {
                        assert(status1.branch === "some-branch", "branch is " + status1.branch);
                        assert(isFullyClean(status1));
                        return clone1.release()
                            .then(() => getAClone({ repoName }))
                            .then(clone2 =>
                                clone2.gitStatus()
                                    .then(status => {
                                        assert(clone2.baseDir === clone1.baseDir,
                                            "this test is pointless if not in the same spot");
                                        assert(status.branch, "master"); // TODO: this needs to be the default branch
                                        assert(isFullyClean(status), status.raw);
                                        return clone2.release();
                                    }));
                    }))
                .then(() => {
                    const reusedAfter = getCounter(reuseKey(repoName)).printObj().count;
                    // we at least re-used this once
                    assert(reusedBefore < reusedAfter, `${reusedBefore} < ${reusedAfter}`);
                })
                .then(done, done);
        }).timeout(20000);

        it("should be on the correct branch even if the branch name overlaps with a file", done => {
            const repoName = "this-repository-exists-to-test-cached-clones-5";
            getAClone({ branch: "this-directory-exists", repoName })
                .then(clone1 =>
                    clone1.gitStatus().then(status1 => {
                        assert(status1.branch === "this-directory-exists", "branch is " + status1.branch);
                        assert(isFullyClean(status1));
                        return clone1.release()
                            .then(() => getAClone({ repoName }))
                            .then(clone2 =>
                                clone2.gitStatus()
                                    .then(status => {
                                        assert(clone2.baseDir === clone1.baseDir,
                                            "this test is pointless if not in the same spot");
                                        assert(status.branch, "master"); // TODO: this needs to be the default branch
                                        assert(isFullyClean(status), status.raw);
                                        return clone2.release();
                                    }));
                    }))
                .then(done, done);
        }).timeout(20000);

        it("should start with the branch in sync with origin", done => {
            const repoName = "this-repository-exists-to-test-cached-clones-2";

            function makeACommit(project: GitProject): Promise<GitProject> {
                return project.addFile("file-that-does-not-yet-exist", "something")
                    .then(p => p.commit("yassss"));
            }

            getAClone({ repoName })
                .then(clone1 => clone1.gitStatus()
                    .then(status1 => {
                        assert(status1.upstream.inSync, "should start in sync");
                        return makeACommit(clone1) // mess it up
                            .then(() => clone1.gitStatus())
                            .then(status1a => {
                                assert(status1a.sha !== status1.sha); // the commit changed things
                                assert(!status1a.upstream.inSync,
                                    "should not be in sync with " + status1a.upstream.branch);
                            })
                            .then(() => clone1.release())
                            .then(() => getAClone({ repoName }))
                            .then(clone2 => clone2.gitStatus()
                                .then(status2 => {
                                    assert(clone2.baseDir === clone1.baseDir,
                                        "this test is pointless if not in the same spot");
                                    assert(status2.upstream.inSync,
                                        "should be in sync again with " + status2.upstream.branch);
                                    return clone2.release();
                                }));
                    }))
                .then(done, done);
        }).timeout(20000);

        it("should default to the repository's default branch");

        it("should start with a new clone if that directory if any of the setup fails", done => {
            const repoName = "this-repository-exists-to-test-cached-clones-1";

            function screwUp(repoRoot: string): Promise<void> {
                // this will make git commands fail fer sher
                return fs.remove(path.join(repoRoot, ".git"));
            }

            getAClone({ repoName })
                .then(clone1 => {
                    const baseDir = clone1.baseDir;
                    return clone1.release()
                        .then(() => screwUp(baseDir))
                        .then(() => getAClone({ repoName }))
                        .then(clone2 => {
                            // we're in the same place
                            assert(clone2.baseDir === clone1.baseDir,
                                "this test is pointless if not in the same spot." +
                                "\nclone 1 provenance: " + clone1.provenance +
                                "\nclone 2 provenance: " + clone2.provenance);
                            // and it worked
                            return clone2.gitStatus()
                                .then(() => clone2.release());
                        });
                })
                .then(done, done);
        }).timeout(20000);

    });

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
