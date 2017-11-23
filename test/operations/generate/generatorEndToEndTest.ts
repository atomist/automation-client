import "mocha";
import * as assert from "power-assert";

import * as shell from "shelljs";
import * as tmp from "tmp-promise";

import axios from "axios";

import { SlackMessage } from "@atomist/slack-messages/SlackMessages";
import * as fs from "fs";
import { fail } from "power-assert";
import { HandlerContext } from "../../../src/HandlerContext";
import { GitHubDotComBase, GitHubRepoRef } from "../../../src/operations/common/GitHubRepoRef";
import { BaseSeedDrivenGeneratorParameters } from "../../../src/operations/generate/BaseSeedDrivenGeneratorParameters";
import { generate } from "../../../src/operations/generate/generatorUtils";
import { GenericGenerator } from "../../../src/operations/generate/GenericGenerator";
import { GitHubProjectPersister } from "../../../src/operations/generate/gitHubProjectPersister";
import { UniversalSeed } from "../../../src/operations/generate/UniversalSeed";
import { GitCommandGitProject } from "../../../src/project/git/GitCommandGitProject";
import { LocalProject } from "../../../src/project/local/LocalProject";
import { NodeFsLocalProject } from "../../../src/project/local/NodeFsLocalProject";
import { Project } from "../../../src/project/Project";
import { hasFile } from "../../../src/util/gitHub";
import { GitHubToken } from "../../credentials";

function tempRepoName() {
    return `test-repo-${new Date().getTime()}`;
}

let TargetOwner = "atomist-travisorg";
const config = {
    headers: {
        Authorization: `token ${GitHubToken}`,
    },
};

describe("generator end to end", () => {

    before(done => {
        axios.get(`${GitHubDotComBase}/user`, config).then(response => {
            TargetOwner = response.data.login;
        }).then(done, done);
    });

    function deleteOrIgnore(repoName: string) {

        const url = `${GitHubDotComBase}/repos/${TargetOwner}/${repoName}`;
        return axios.delete(url, config)
            .catch(err => {
                console.log(`cleanup: deleting ${repoName} failed with ${err}. oh well`);
                return;
            });
    }

    it("should create a new GitHub repo using UniversalSeed", function(done) {
        this.retries(3);
        const repoName = tempRepoName();
        const cleanupDone = (err: Error | void = null) => {
            deleteOrIgnore(repoName).then(done(err));
        };

        const seed = new UniversalSeed();
        seed.targetOwner = TargetOwner;
        seed.targetRepo = repoName;
        (seed as any).githubToken = GitHubToken;
        seed.handle(MockHandlerContext as HandlerContext, seed)
            .then(result => {
                assert(result.code === 0);
                // Check the repo
                return hasFile(GitHubToken, TargetOwner, repoName, "pom.xml")
                    .then(r => {
                        assert(r);
                        return GitCommandGitProject.cloned({token: GitHubToken},
                            new GitHubRepoRef(TargetOwner, repoName))
                            .then(verifyPermissions);
                    });
            }).then(() => cleanupDone(), cleanupDone);
    }).timeout(20000);

    it("should create a new GitHub repo using GenericGenerator", function(done) {
        this.retries(3);
        const repoName = tempRepoName();
        const cleanupDone = (err: Error | void = null) => {
            deleteOrIgnore(repoName).then(done(err));
        };

        const generator = new GenericGenerator(BaseSeedDrivenGeneratorParameters,
            () => p => Promise.resolve(p));
        const params = generator.freshParametersInstance();
        params.source.owner = "atomist-seeds";
        params.source.repo = "spring-rest-seed";
        params.target.owner = TargetOwner;
        params.target.repo = repoName;
        params.target.githubToken = GitHubToken;
        generator.handle(MockHandlerContext as HandlerContext, params)
            .then(result => {
                assert(result.code === 0);
                // Check the repo
                return hasFile(GitHubToken, TargetOwner, repoName, "pom.xml")
                    .then(r => {
                        assert(r);
                        return GitCommandGitProject.cloned({token: GitHubToken},
                            new GitHubRepoRef(TargetOwner, repoName))
                            .then(verifyPermissions);
                    });
            }).then(() => cleanupDone(), cleanupDone);
    }).timeout(20000);

    it("should create a new GitHub repo using generate function", function(done) {
        this.retries(3);
        const repoName = tempRepoName();
        const cleanupDone = (err: Error | void) => {
            deleteOrIgnore(repoName).then(done(err));
        };

        const clonedSeed = GitCommandGitProject.cloned({token: GitHubToken},
            new GitHubRepoRef("atomist-seeds", "spring-rest-seed"));
        const targetRepo = new GitHubRepoRef(TargetOwner, repoName);

        generate(clonedSeed, undefined, {token: GitHubToken},
            p => Promise.resolve(p), GitHubProjectPersister,
            targetRepo)
            .then(result => {
                assert(result.success);
                // Check the repo
                return hasFile(GitHubToken, TargetOwner, repoName, "pom.xml")
                    .then(r => {
                        assert(r);
                        return GitCommandGitProject.cloned({token: GitHubToken},
                            targetRepo)
                            .then(verifyPermissions)
                            .then(() => {
                                return;
                            }); // done() doesn't want your stuff
                    });
            }).then(cleanupDone, cleanupDone);
    }).timeout(20000);

    it("should refuse to create a new GitHub repo using existing repo name", function(done) {
        this.retries(5);

        const clonedSeed = GitCommandGitProject.cloned({token: GitHubToken},
            new GitHubRepoRef("atomist-seeds", "spring-rest-seed"));
        const targetRepo = new GitHubRepoRef("atomist-travisorg", "this-repository-exists");

        generate(clonedSeed, undefined, {token: GitHubToken},
            p => Promise.resolve(p), GitHubProjectPersister,
            targetRepo)
            .then(() => {
                fail("Should not have succeeded");
            })
            .catch(err => {
                assert(err.message.includes("exists")); // this is only because we put "Probably exists" in the string
            }).then(done, done);
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

describe("Local project creation", () => {

    it("should create a new local project", done => {
        const cwd = tmp.dirSync().name;
        const repoName = tempRepoName();
        shell.cd(cwd);

        function cleaningDone(err: Error | void) {
            shell.cd("-");
            done(err);
        }

        const seed = new UniversalSeed();
        seed.targetRepo = repoName;
        seed.local = true;
        (seed as any).githubToken = GitHubToken;
        seed.handle(MockHandlerContext as HandlerContext, seed)
            .then(r => {
                const result = r as any;
                assert(result.code === 0);
                assert(result.baseDir);
                NodeFsLocalProject.fromExistingDirectory(
                    new GitHubRepoRef("owner", repoName), cwd + "/" + repoName)
                    .then(created => {
                        assert(created.fileExistsSync("pom.xml"));
                    });
            }).then(cleaningDone, cleaningDone);
    }).timeout(10000);
});

export const MockHandlerContext = {
    messageClient: {
        respond(msg: string | SlackMessage) {
            return Promise.resolve();
        },
    },
    graphClient: {
        executeMutationFromFile(file: string, variables?: any): Promise<any> {
            return Promise.resolve({createSlackChannel: [{id: "stts"}]});
        },
    },
};
