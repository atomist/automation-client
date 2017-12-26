import { BitBucketCredentials, BitBucketRepoRef } from "../../../../src/operations/common/BitBucketRepoRef";
import { GitCommandGitProject } from "../../../../src/project/git/GitCommandGitProject";
import { GitProject } from "../../../../src/project/git/GitProject";
import { TestRepositoryVisibility } from "../../../credentials";
import { tempProject } from "../../utils";

const BitBucketUser = process.env.ATLASSIAN_USER;
const BitBucketPassword = process.env.ATLASSIAN_PASSWORD;

const bbCreds = {token: BitBucketPassword, basic: true} as BitBucketCredentials;

describe("BitBucket support", () => {

    it("should clone", done => {
        GitCommandGitProject.cloned(bbCreds,
            new BitBucketRepoRef("springrod", "austin", "master"))
            .then(bp => {
                bp.isClean()
                    .then(r => {
                        done();
                    });
            }).catch(done);
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
    }).timeout(15000);

    it("should clone and add file in new branch then raise PR", () => {
        return doWithNewRemote(bp => {
            bp.addFileSync("Thing", "1");
            return bp.commit("Added Thing1")
                .then(ar => {
                    return bp.createBranch("thing1")
                        .then(() => {
                            return bp.push()
                                .then(() => {
                                    return bp.raisePullRequest("Add a thing", "Dr Seuss is fun");
                                });
                        });

                });
        });
    }).timeout(15000);

    it("add a file, init and commit, then push to new remote repo", () => {
        return doWithNewRemote(bp => {
            return bp.gitStatus();
        });
    }).timeout(16000);

});

function doWithNewRemote(what: (p: GitProject) => Promise<any>) {
    const p = tempProject();
    p.addFileSync("README.md", "Here's the readme for my new repo");

    const repo = `test-repo-2-${new Date().getTime()}`;

    const gp: GitProject = GitCommandGitProject.fromProject(p, bbCreds);
    const owner = BitBucketUser;

    const bbid = new BitBucketRepoRef(owner, repo);

    return gp.init()
        .then(() => gp.createAndSetRemote(
            bbid,
            "Thing1", TestRepositoryVisibility))
        .then(() => gp.commit("Added a README"))
        .then(() => gp.push())
        .then(() => GitCommandGitProject.cloned(bbCreds, bbid))
        .then(clonedp => {
            return what(clonedp)
                .then(() => {
                    return bbid.deleteRemote(bbCreds);
                });
        })
        .catch(err => {
            bbid.deleteRemote(bbCreds).then(() => {
                throw new Error(err);
            });
        });
}
