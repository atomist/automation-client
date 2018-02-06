import { HandlerContext } from "../../src/HandlerContext";
import { BasicAuthCredentials } from "../../src/operations/common/BasicAuthCredentials";
import { BitBucketRepoRef } from "../../src/operations/common/BitBucketRepoRef";
import { GitCommandGitProject } from "../../src/project/git/GitCommandGitProject";
import { GitProject } from "../../src/project/git/GitProject";
import { TestRepositoryVisibility } from "../credentials";
import { tempProject } from "../project/utils";

export const BitBucketUser = process.env.ATLASSIAN_USER;
export const BitBucketPassword = process.env.ATLASSIAN_PASSWORD;

export const BitBucketCredentials = { username: BitBucketUser, password: BitBucketPassword } as BasicAuthCredentials;

describe("BitBucket support", () => {

    it("should clone", done => {
        GitCommandGitProject.cloned({} as HandlerContext, BitBucketCredentials,
            new BitBucketRepoRef("jessitron", "poetry", "master"))
            .then(bp => bp.gitStatus())
            .then(() => done(), done);
    }).timeout(15000);

    it("should clone and add file in new branch", () => {
        return doWithNewRemote(bp => {
            bp.addFileSync("Thing", "1");
            return bp.commit("Added Thing1")
                .then(ar => {
                    return bp.createBranch("thing1")
                        .then(() => bp.push());
                });
        });
    }).timeout(20000);

    it("should clone and add file in new branch then raise PR", () => {
        return doWithNewRemote(bp => {
            bp.addFileSync("Thing", "1");
            return bp.commit("Added Thing1")
                .then(ar => bp.createBranch("thing1"))
                .then(() => bp.push())
                .then(() => bp.raisePullRequest("Add a thing", "Dr Seuss is fun"));
        });
    }).timeout(20000);

    it("add a file, init and commit, then push to new remote repo", () => {
        return doWithNewRemote(bp => {
            return bp.gitStatus();
        });
    }).timeout(20000);

});

function doWithNewRemote(testAndVerify: (p: GitProject) => Promise<any>) {
    const p = tempProject();
    p.addFileSync("README.md", "Here's the readme for my new repo");

    const repo = `test-${new Date().getTime()}`;

    const gp: GitProject = GitCommandGitProject.fromProject(p, BitBucketCredentials);
    const owner = BitBucketUser;

    const bbid = new BitBucketRepoRef(owner, repo);

    return gp.init()
        .then(() => gp.createAndSetRemote(
            bbid,
            "Thing1", TestRepositoryVisibility))
        .then(() => gp.commit("Added a README"))
        .then(() => gp.push())
        .then(() => GitCommandGitProject.cloned({} as HandlerContext, BitBucketCredentials, bbid))
        .then(clonedp => {
            return testAndVerify(clonedp);
        })
        .then(() => bbid.deleteRemote(BitBucketCredentials),
        err => bbid.deleteRemote(BitBucketCredentials)
            .then(() => Promise.reject(new Error(err))));
}
