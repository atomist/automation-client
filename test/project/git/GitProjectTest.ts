import axios from "axios";
import "mocha";

import * as assert from "power-assert";
import { tempProject } from "../utils";

import * as exec from "child_process";
import { ActionResult } from "../../../src/action/ActionResult";
import { GitHubDotComBase, GitHubRepoRef } from "../../../src/operations/common/GitHubRepoRef";
import { GitCommandGitProject } from "../../../src/project/git/GitCommandGitProject";
import { GitProject } from "../../../src/project/git/GitProject";
import { LocalProject } from "../../../src/project/local/LocalProject";
import { Project } from "../../../src/project/Project";
import { GitHubToken, TestRepositoryVisibility } from "../../credentials";

function checkProject(p: Project) {
    const f = p.findFileSync("package.json");
    assert(!!p.id);
    assert(!!p.id.sha);
    assert(!!p.id.owner);
    assert(!!p.id.repo);
    assert(f.getContentSync());
}

const Creds = {token: GitHubToken};

describe("GitProject", () => {

    function getOwnerByToken(): Promise<string> {
        const config = {
            headers: {
                Authorization: `token ${GitHubToken}`,
            },
        };
        return axios.get(`${GitHubDotComBase}/user`, config).then(response =>
            response.data.login,
        );
    }

    function deleteRepoIfExists(ownerAndRepo: { owner: string, repo: string }): Promise<any> {
        const config = {
            headers: {
                Authorization: `token ${GitHubToken}`,
            },
        };
        const url = `${GitHubDotComBase}/repos/${ownerAndRepo.owner}/${ownerAndRepo.repo}`;
        return axios.delete(url, config)
            .catch(err => {
                // console.log("IGNORING " + err);
            });
    }

    function newRepo(): Promise<{ owner: string, repo: string }> {
        const config = {
            headers: {
                Authorization: `token ${GitHubToken}`,
            },
        };
        const name = `test-repo-${new Date().getTime()}`;
        const description = "a thing";
        const url = `${GitHubDotComBase}/user/repos`;
        console.log("Visibility is " + TestRepositoryVisibility);
        return getOwnerByToken().then(owner => axios.post(url, {
            name,
            description,
            private: TestRepositoryVisibility === "private",
            auto_init: true,
        }, config).catch(error => {
            throw new Error(`Could not create repo ${owner}/${name}: ` + error.message);
        }).then(() =>
            ({owner, repo: name}),
        ));
    }

    it("add a file, init and commit", done => {
        const p = tempProject();
        p.addFileSync("Thing", "1");
        const gp: GitProject = GitCommandGitProject.fromProject(p, Creds);
        gp.init().then(() => gp.commit("Added a Thing").then(c => {
            exec.exec("git status; git log", {cwd: p.baseDir}, (err, stdout, stderr) => {
                if (err) {
                    // node couldn't execute the command
                    console.error(`Node err on dir [${p.baseDir}]: ${err}`);
                    return;
                }
                done();
            });
        }))
            .catch(done);
    });

    it("commit then add has uncommitted", done => {
        const p = tempProject(new GitHubRepoRef("owner", "repo"));
        p.addFileSync("Thing", "1");
        const gp: GitProject = GitCommandGitProject.fromProject(p, Creds);
        gp.init()
            .then(() => gp.isClean())
            .then(clean => {
                assert(!clean.success);
                assert(!!clean.target.branch);
                assert(!!clean.target.id);
                assert(clean.target.id.sha === "master");
                done();
            })
            .catch(done);
    });

    it("uses then function", done => {
        const p = tempProject();
        p.addFileSync("Thing", "1");
        const gp: GitProject = GitCommandGitProject.fromProject(p, Creds);
        gp.init()
            .then(() => gp.isClean())
            .then(assertNotClean)
            .then(done)
            .catch(done);
    });

    function assertNotClean(r: ActionResult<GitCommandGitProject>) {
        assert(r.target);
        assert(!r.success);
    }

    it("add a file, check doesn't have uncommitted", done => {
        const p = tempProject();
        p.addFileSync("Thing", "1");
        const gp: GitProject = GitCommandGitProject.fromProject(p, Creds);
        gp.init()
            .then(() => gp.commit("Added a Thing"))
            .then(() => gp.isClean())
            .then(clean => {
                assert(clean);
                done();
            })
            .catch(done);
    });

    it("add a file, init and commit, then push to new remote repo", function (done) {
        this.retries(5);

        const p = tempProject();
        p.addFileSync("Thing", "1");

        const repo = `test-repo-2-${new Date().getTime()}`;

        const gp: GitProject = GitCommandGitProject.fromProject(p, Creds);

        getOwnerByToken().then(owner => gp.init()
            .then(_ => gp.createAndSetGitHubRemote(owner, repo, "Thing1", TestRepositoryVisibility))
            .then(() => gp.commit("Added a Thing"))
            .then(_ =>
                gp.push().then(() => deleteRepoIfExists({owner, repo}).then(done)),
            ).catch(() => deleteRepoIfExists({owner, repo}).then(done)),
        ).catch(done);
    }).timeout(16000);

    it("add a file, then PR push to remote repo", function (done) {
        this.retries(1);

        newRepo().then(ownerAndRepo => GitCommandGitProject.cloned(Creds,
            new GitHubRepoRef(ownerAndRepo.owner, ownerAndRepo.repo))
            .then(gp => {
                gp.addFileSync("Cat", "hat");
                const branch = "thing2";
                return gp.createBranch(branch)
                    .then(x => gp.commit("Added a Thing"))
                    .then(x => gp.push())
                    .then(x => {
                        return gp.raisePullRequest("Thing2", "Adds another character");
                    })
                    .then(x => deleteRepoIfExists(ownerAndRepo));
            }).catch(() => deleteRepoIfExists(ownerAndRepo)))
            .then(done, done);

    }).timeout(20000);

    it("check out commit", done => {
        const sha = "590ed8f7a2430d45127ea04cc5bdf736fe698712";
        GitCommandGitProject.cloned(Creds, new GitHubRepoRef("atomist", "microgrammar", sha))
            .then(p => {
                checkProject(p);
                const gp: GitProject = GitCommandGitProject.fromProject(p, Creds);
                const baseDir = (p as LocalProject).baseDir;

                gp.checkout(sha)
                    .then(_ => {
                        exec.exec("git status", {cwd: baseDir}, (err, stdout, stderr) => {
                            if (err) {
                                // node couldn't execute the command
                                console.error(`Node err on dir [${baseDir}]: ${err}`);
                                return;
                            }

                            // the *entire* stdout and stderr (buffered)
                            console.log(`stdout: ${stdout}`);
                            console.log(`stderr: ${stderr}`);
                            done();
                        });
                    });
            }).catch(done);
    }).timeout(5000);

    it.skip("clones a project subdirectory", done => {
        GitCommandGitProject.cloned(Creds, new GitHubRepoRef("pallets", "flask", "master",
            GitHubDotComBase, "examples/flaskr"))
            .then(gp => {
                assert(!!gp.findFileSync("flaskr/__init__.py"));
                gp.isClean()
                    .then(r => {
                        assert(r.success, "We should be able to get git status for a subdirectory");
                        done();
                    });
            }).catch(done);
    });

});
