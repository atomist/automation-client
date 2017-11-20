import "mocha";

import * as assert from "power-assert";
import { fail } from "power-assert";
import { runCommand } from "../../../src/action/cli/commandLine";
import { GitHubRepoRef } from "../../../src/operations/common/GitHubRepoRef";
import { GitCommandGitProject } from "../../../src/project/git/GitCommandGitProject";
import { CachingDirectoryManager } from "../../../src/spi/clone/CachingDirectoryManager";
import { DefaultCloneOptions } from "../../../src/spi/clone/DirectoryManager";
import { GitHubToken } from "../../atomist.config";
import { GitProject } from "../../../src/project/git/GitProject";

const Creds = { token: GitHubToken };
const Owner = "atomist-travisorg";
const RepoName = "this-repository-exists";

describe("cached git clone projects", () => {

    const getAClone = (opts: { branch?: string, repoName?: string } = {}) => {
        const repoName = opts.repoName || RepoName;
        const repositoryThatExists =
            opts.branch ? new GitHubRepoRef(Owner, repoName, opts.branch) : new GitHubRepoRef(Owner, repoName);
        return GitCommandGitProject.cloned(Creds, repositoryThatExists, DefaultCloneOptions, CachingDirectoryManager);
    };

    it("never returns the same place on the filesystem twice at once", done => {
        const clones = [getAClone(), getAClone()];
        const cleaningDone = (err: Error | void) => {
            Promise.all(clones)
                .then(them =>
                    them.forEach(clone => clone.release()))
                .then(done(err));
        };

        Promise.all(clones)
            .then(them => {
                assert(them[0].baseDir !== them[1].baseDir,
                    "Oh no! two simultaneous projects in " + them[0].baseDir);
            })
            .then(cleaningDone, cleaningDone);
    }).timeout(5000);

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
    }).timeout(5000);

    it("should be clean when you get the directory again", done => {
        const repoName = "this-repository-exists-to-test-cached-clones-4";
        getAClone({ repoName })
            .then(project => project.addFile("stuff", "yeah"))
            .then(project => project.addFile("ignored-file", "delete this too yo"))
            .then(project => project.findFile("README.md")
                .then(file => file.setContent("This is something different"))
                .then(() => project))
            .then(clone1 => clone1.release()
                .then(() => getAClone( { repoName }))
                .then(clone2 =>
                    clone2.gitStatus()
                        .then(status => {
                            assert(clone2.baseDir === clone1.baseDir,
                                "this test is pointless if not in the same spot");
                            assert(status.isClean, status.raw);
                            return clone2.release();
                        })))
            .then(done, done);
    });

    it("should be on the correct branch when you get the directory again", done => {
        const repoName = "this-repository-exists-to-test-cached-clones-3";
        getAClone({ branch: "some-branch", repoName })
            .then(clone1 =>
                clone1.gitStatus().then(status1 => {
                    assert(status1.branch === "some-branch", "branch is " + status1.branch);
                    assert(status1.isClean);
                    return clone1.release()
                        .then(() => getAClone({ repoName }))
                        .then(clone2 =>
                            clone2.gitStatus()
                                .then(status => {
                                    assert(clone2.baseDir === clone1.baseDir,
                                        "this test is pointless if not in the same spot");
                                    assert(status.branch, "master"); // TODO: this needs to be the default branch
                                    assert(status.isClean, status.raw);
                                    return clone2.release();
                                }));
                }))
            .then(done, done);
    }).timeout(5000);

    it("should start with the branch in sync with origin", done => {
        const repoName = "this-repository-exists-to-test-cached-clones-2";

        function makeACommit(project: GitProject): Promise<GitProject> {
            return project.addFile("file-that-does-not-yet-exist", "something")
                .then(p => p.commit("yassss"))
                .then(result => result.target);
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
    });

    it("should default to the repository's default branch");

    it("should start with a new clone if that directory if any of the setup fails", done => {
        const repoName = "this-repository-exists-to-test-cached-clones-1";

        function screwUp(repoRoot: string) {
            // this will make git commands fail fer sher
            return runCommand("rm -rf .git", { cwd: repoRoot });
        }

        console.log("hello there");
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
    });

});
