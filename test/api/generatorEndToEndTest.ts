import "mocha";
import * as assert from "power-assert";
import { fail } from "power-assert";

import axios from "axios";
import * as fs from "fs";

import { SlackMessage } from "@atomist/slack-messages/SlackMessages";

import { ActionResult } from "../../src/action/ActionResult";
import { GitHubDotComBase, GitHubRepoRef } from "../../src/operations/common/GitHubRepoRef";
import { ProjectOperationCredentials } from "../../src/operations/common/ProjectOperationCredentials";
import { RemoteRepoRef } from "../../src/operations/common/RepoId";
import { generate } from "../../src/operations/generate/generatorUtils";
import { RemoteGitProjectPersister } from "../../src/operations/generate/remoteGitProjectPersister";
import { GitCommandGitProject } from "../../src/project/git/GitCommandGitProject";
import { LocalProject } from "../../src/project/local/LocalProject";
import { Project } from "../../src/project/Project";
import { hasFile } from "../../src/util/gitHub";
import { GitHubToken } from "./gitHubTest";

export function tempRepoName() {
    return `test-repo-${new Date().getTime()}`;
}

let TargetOwner = "atomist-travisorg";
const config = {
    headers: {
        Authorization: `token ${GitHubToken}`,
    },
};

export function deleteOrIgnore(rr: RemoteRepoRef, creds: ProjectOperationCredentials): Promise<ActionResult<any>> {
    return rr.deleteRemote(creds)
        .catch(err => {
            console.log(`cleanup: deleting ${JSON.stringify(rr)} failed with ${err}. oh well`);
            return null;
        });
}

describe("generator end to end", () => {

    before(done => {
        axios.get(`${GitHubDotComBase}/user`, config).then(response => {
            TargetOwner = response.data.login;
        }).then(() => done(), done);
    });

    it("should create a new GitHub repo using generate function", function(done) {
        this.retries(3);
        const repoName = tempRepoName();
        const rr = new GitHubRepoRef(TargetOwner, repoName);
        const cleanupDone = (err: Error | void = null) => {
            deleteOrIgnore(rr, { token: GitHubToken }).then(done(err));
        };

        const clonedSeed = GitCommandGitProject.cloned({ token: GitHubToken },
            new GitHubRepoRef("atomist-seeds", "spring-rest-seed"));
        const targetRepo = new GitHubRepoRef(TargetOwner, repoName);

        generate(clonedSeed, undefined, { token: GitHubToken },
            p => Promise.resolve(p), RemoteGitProjectPersister,
            targetRepo)
            .then(result => {
                assert(result.success);
                // Check the repo
                return hasFile(GitHubToken, TargetOwner, repoName, "pom.xml")
                    .then(r => {
                        assert(r);
                        return GitCommandGitProject.cloned({ token: GitHubToken },
                            targetRepo)
                            .then(verifyPermissions)
                            .then(() => {
                                return;
                            }); // done() doesn't want your stuff
                    });
            }).then(() => cleanupDone(), cleanupDone);
    }).timeout(20000);

    it("should refuse to create a new GitHub repo using existing repo name", function(done) {
        this.retries(5);

        const clonedSeed = GitCommandGitProject.cloned({ token: GitHubToken },
            new GitHubRepoRef("atomist-seeds", "spring-rest-seed"));
        const targetRepo = new GitHubRepoRef("atomist-travisorg", "this-repository-exists");

        generate(clonedSeed, undefined, { token: GitHubToken },
            p => Promise.resolve(p), RemoteGitProjectPersister,
            targetRepo)
            .then(() => {
                fail("Should not have succeeded");
            })
            .catch(err => {
                assert(err.message.includes("exists")); // this is only because we put "Probably exists" in the string
            }).then(() => done(), done);
    }).timeout(20000);

    function verifyPermissions(p: LocalProject): Promise<Project> {
        // Check that Maven wrapper mvnw from Spring project is executable
        const path = p.baseDir + "/mvnw";
        assert(fs.statSync(path).isFile());
        fs.access(path, fs.constants.X_OK, err => {
            if (err) {
                fail("Not executable");
            }
        });
        return Promise.resolve(p);
    }

});

export const MockHandlerContext = {
    messageClient: {
        respond(msg: string | SlackMessage) {
            return Promise.resolve();
        },
    },
    graphClient: {
        executeMutationFromFile(file: string, variables?: any): Promise<any> {
            return Promise.resolve({ createSlackChannel: [{ id: "stts" }] });
        },
    },
};
