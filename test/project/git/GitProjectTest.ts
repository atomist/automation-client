import axios from "axios";
import "mocha";

import * as assert from "power-assert";
import { tempProject } from "../utils";

import * as exec from "child_process";
import { ActionResult } from "../../../src/action/ActionResult";
import { SimpleRepoId } from "../../../src/operations/common/RepoId";
import { GitCommandGitProject } from "../../../src/project/git/GitCommandGitProject";
import { GitHubBase, GitProject } from "../../../src/project/git/GitProject";
import { LocalProject } from "../../../src/project/local/LocalProject";
import { Project } from "../../../src/project/Project";
import { GitHubToken } from "../../atomist.config";

function checkProject(p: Project) {
    const f = p.findFileSync("package.json");
    assert(!!p.id);
    assert(!!p.id.sha);
    assert(!!p.id.owner);
    assert(!!p.id.repo);
    assert(f.getContentSync());
}

const TargetRepo = `test-repo-${new Date().getTime()}`;
let TargetOwner = "johnsonr";

const Creds = {token: GitHubToken };

describe("GitProject", () => {

    before(done => {
        const config = {
            headers: {
                Authorization: `token ${GitHubToken}`,
            },
        };
        axios.get(`${GitHubBase}/user`, config).then(response => {
            TargetOwner = response.data.login;
            done();
        });
    });

    afterEach(done => {
        const config = {
            headers: {
                Authorization: `token ${GitHubToken}`,
            },
        };
        const url = `${GitHubBase}/repos/${TargetOwner}/${TargetRepo}`;
        axios.delete(url, config)
            .then(() => {
                done();
            })
            .catch(err => {
                console.log("IGNORING " + err);
                done();
            });
    });

    function newRepo(): Promise<any> {
        const config = {
            headers: {
                Authorization: `token ${GitHubToken}`,
            },
        };
        const name = TargetRepo;
        const description = "a thing";
        const url = `${GitHubBase}/user/repos`;
        return axios.post(url, {
            name,
            description,
            private: true,
            auto_init: true,
        }, config).catch(error => {
            throw new Error("Could not create repo: " + error.message);
        });
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

                // the *entire* stdout and stderr (buffered)
                console.log(`stdout: ${stdout}`);
                console.log(`stderr: ${stderr}`);
                done();
            });
        }))
            .catch(done);
    });

    it("commit then add has uncommitted", done => {
        const p = tempProject(new SimpleRepoId("owner", "repo"));
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

    it("add a file, init and commit, then push to new remote repo", function(done) {
        this.retries(5);

        const p = tempProject();
        p.addFileSync("Thing", "1");

        const gp: GitProject = GitCommandGitProject.fromProject(p, Creds);
        gp.init()
            .then(_ => gp.createAndSetGitHubRemote(TargetOwner, TargetRepo, "Thing1"))
            .then(() => gp.commit("Added a Thing"))
            .then(_ => {
                gp.push();
                done();
            })
            .catch(done);
    }).timeout(6000);

    it("add a file, then PR push to remote repo", function(done) {
        this.retries(5);

        newRepo().then(_ => {
            return GitCommandGitProject.cloned(Creds, TargetOwner, TargetRepo).then(gp => {
                gp.addFileSync("Cat", "hat");
                const branch = "thing2";
                gp.createBranch(branch)
                    .then(x => gp.commit("Added a Thing"))
                    .then(x => gp.push())
                    .then(x => {
                        return gp.raisePullRequest("Thing2", "Adds another character");
                    })
                    .then(x => done());
            });
        }).catch(done);
    }).timeout(20000);

    it("check out commit", done => {
        const sha = "590ed8f7a2430d45127ea04cc5bdf736fe698712";
        GitCommandGitProject.cloned(Creds, "atomist", "microgrammar", sha)
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

});
