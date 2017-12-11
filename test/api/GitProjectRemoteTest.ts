import "mocha";
import * as assert from "power-assert";

import axios from "axios";
import * as _ from "lodash";

import { GitHubDotComBase, GitHubRepoRef } from "../../src/operations/common/GitHubRepoRef";
import { GitCommandGitProject } from "../../src/project/git/GitCommandGitProject";
import { GitProject } from "../../src/project/git/GitProject";
import { TestRepositoryVisibility } from "../credentials";
import { tempProject } from "../project/utils";
import { Creds, GitHubToken } from "./gitHubTest";

describe("GitProject remote", () => {

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
                .then(() => deleteRepoIfExists({ owner, repo })),
        ).catch(err => deleteRepoIfExists({ owner, repo })
            .then(() => Promise.reject(err))),
        ).then(() => done(), done);

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
                }).catch(err => deleteRepoIfExists(ownerAndRepo)
                    .then(() => Promise.reject(err))))
            .then(() => done(), done);

    }).timeout(20000);

});

/**
 * Create a new repo we can use for tests
 * @return {Promise<{owner: string; repo: string}>}
 */
export function newRepo(): Promise<{ owner: string, repo: string }> {
    const config = {
        headers: {
            Authorization: `token ${GitHubToken}`,
        },
    };
    const name = `test-repo-${new Date().getTime()}`;
    const description = "a thing";
    const url = `${GitHubDotComBase}/user/repos`;
    console.debug("Visibility is " + TestRepositoryVisibility);
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

export function deleteRepoIfExists(ownerAndRepo: { owner: string, repo: string }): Promise<any> {
    console.debug("Cleanup: deleting " + ownerAndRepo.repo);
    const config = {
        headers: {
            Authorization: `token ${GitHubToken}`,
        },
    };
    const url = `${GitHubDotComBase}/repos/${ownerAndRepo.owner}/${ownerAndRepo.repo}`;
    return axios.delete(url, config)
        .catch(err => {
            console.error(`error deleting ${ownerAndRepo.repo}, ignoring. ${err.response.status}`);
        });
}

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
