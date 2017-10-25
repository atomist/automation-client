import "mocha";
import * as assert from "power-assert";

import * as shell from "shelljs";
import * as tmp from "tmp-promise";

import axios from "axios";

import { HandlerContext } from "../../../src/HandlerContext";
import { hasFile } from "../../../src/internal/util/gitHub";
import { SimpleRepoId } from "../../../src/operations/common/RepoId";
import { UniversalSeed } from "../../../src/operations/generate/UniversalSeed";
import { GitHubBase } from "../../../src/project/git/GitProject";
import { NodeFsLocalProject } from "../../../src/project/local/NodeFsLocalProject";
import { GitHubToken } from "../../atomist.config";

const TargetRepo = `test-repo-${new Date().getTime()}`;
let TargetOwner = "johnsonr";

describe("Universal seed end to end", () => {

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
            .then(_ => {
                done();
            })
            .catch(err => {
                console.log("IGNORING " + err);
                done();
            });
    });

    it("should create a new GitHub repo", function(done) {
        this.retries(5);

        const seed = new UniversalSeed();
        seed.targetOwner = TargetOwner;
        seed.targetRepo = TargetRepo;
        (seed as any).githubToken = GitHubToken;
        seed.handle(MockHandlerContext as HandlerContext, seed)
            .then(result => {
                assert(result.code === 0);
                // Check the repo
                return hasFile(GitHubToken, TargetOwner, TargetRepo, "pom.xml")
                    .then(r => {
                        assert(r);
                        done();
                    });
            }).catch(done);
    }).timeout(20000);

    it("should create a new local project", done => {
        const cwd = tmp.dirSync().name;
        shell.cd(cwd);
        const seed = new UniversalSeed();
        seed.targetRepo = TargetRepo;
        seed.local = true;
        (seed as any).githubToken = GitHubToken;
        seed.handle(MockHandlerContext as HandlerContext, seed)
            .then(r => {
                const result = r as any;
                assert(result.code === 0);
                assert(result.baseDir);
                const created = new NodeFsLocalProject(new SimpleRepoId("owner", TargetRepo), cwd + "/" + TargetRepo);
                assert(created.fileExistsSync("pom.xml"));
                done();
            }).catch(done);
    }).timeout(10000);

});

export const MockHandlerContext = {
    graphClient: {
        executeMutationFromFile(file: string, variables?: any): Promise<any> {
            return Promise.resolve({ createSlackChannel: [ { id: "stts" } ]});
        },
    },
};
