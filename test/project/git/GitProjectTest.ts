import axios from "axios";
import "mocha";

import * as assert from "power-assert";
import { tempProject } from "../utils";

import * as _ from "lodash";
import { ActionResult } from "../../../src/action/ActionResult";
import { GitHubDotComBase, GitHubRepoRef } from "../../../src/operations/common/GitHubRepoRef";
import { GitCommandGitProject } from "../../../src/project/git/GitCommandGitProject";
import { GitProject } from "../../../src/project/git/GitProject";
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
        return getOwnerByToken()
            .then(owner => axios.post(url, {
                name,
                description,
                private: TestRepositoryVisibility === "private",
                auto_init: true,
            }, config)
                .then(() =>
                    ({ owner, repo: name })))
            .catch(error => {
                if (error.response.status === 422) {
                    throw new Error("Could not create repository. GitHub says: " +
                        _.get(error, "response.data.message", "nothing"));
                } else {
                    throw new Error("Could not create repo: " + error.message);
                }
            });
    }

    it("add a file, init and commit", done => {
        const p = tempProject();
        p.addFileSync("Thing", "1");
        const gp: GitProject = GitCommandGitProject.fromProject(p, Creds);
        gp.init()
            .then(() => gp.commit("Added a Thing"))
            .then(c => {
                // TODO: check that the SHA has changed.
                // this will be easy after #58 is closed
            })
            .then(() => done(), done);
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
            .then(() => done(), done);
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
            })
            .then(() => done(), done);
    });

    it("add a file, init and commit, then push to new remote repo", function(done) {
        this.retries(5);

        const p = tempProject();
        p.addFileSync("Thing", "1");

        const repo = `test-repo-2-${new Date().getTime()}`;

        const gp: GitProject = GitCommandGitProject.fromProject(p, Creds);

        getOwnerByToken().then(owner => gp.init()
            .then(() => gp.createAndSetGitHubRemote(owner, repo, "Thing1", TestRepositoryVisibility))
            .then(() => gp.commit("Added a Thing"))
            .then(() => gp.push()
                    .then(() => deleteRepoIfExists({owner, repo}).then(done)),
            ).catch(() => deleteRepoIfExists({owner, repo}).then(done)),
        ).catch(done);

    }).timeout(16000);

    it("add a file, then PR push to remote repo", function(done) {
        this.retries(1);

        newRepo()
            .then(ownerAndRepo => GitCommandGitProject.cloned(Creds,
                new GitHubRepoRef(ownerAndRepo.owner, ownerAndRepo.repo))
                .then(gp => {
                    gp.addFileSync("Cat", "hat");
                    const branch = "thing2";
                    return gp.createBranch(branch)
                        .then(() => gp.commit("Added a Thing"))
                        .then(() => gp.push())
                        .then(() => gp.raisePullRequest("Thing2", "Adds another character"))
                        .then(() => deleteRepoIfExists(ownerAndRepo));
                }).catch( err => {
                    deleteRepoIfExists(ownerAndRepo).then(() => Promise.reject(err));
                }))
            .then(() => done(), done);

    }).timeout(20000);

    it("check out commit", done => {
        const sha = "590ed8f7a2430d45127ea04cc5bdf736fe698712";
        GitCommandGitProject.cloned(Creds, new GitHubRepoRef("atomist", "microgrammar", sha))
            .then(p => {
                checkProject(p);
                const gp: GitProject = GitCommandGitProject.fromProject(p, Creds);
                // TODO: check that it has the right sha
                // this will be easy after cached-clones-58 is merged
            })
            .then(() => done(), done);
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
