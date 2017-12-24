import { BitBucketCredentials, BitBucketRepoRef } from "../../../../src/operations/common/BitBucketRepoRef";
import { GitCommandGitProject } from "../../../../src/project/git/GitCommandGitProject";
import { tempProject } from "../../utils";
import { GitProject } from "../../../../src/project/git/GitProject";
import { TestRepositoryVisibility } from "../../../credentials";

const BitBucketPassword = process.env.BITBUCKET_PASSWORD;

const bbCreds = {token: BitBucketPassword, basic: true} as BitBucketCredentials;

describe("BitBucket support", () => {

    it("should clone", done => {
        GitCommandGitProject.cloned(bbCreds,
            new BitBucketRepoRef("springrod", "austin", "master"))
            .then(bp => {
                console.log("Cloned OK");
                bp.isClean()
                    .then(r => {
                        done();
                    });
            }).catch(done);
    }).timeout(15000);

    // it("should clone and add file in new branch", done => {
    //     GitCommandGitProject.cloned(bbCreds,
    //         new BitBucketRepoRef("springrod", "austin", "master"))
    //         .then(bp => {
    //             bp.addFileSync("Thing", "1");
    //             bp.commit("Added Thing1")
    //                 .then(ar => {
    //                     bp.createBranch("thing1")
    //                         .then(() => {
    //                             bp.push().then(() => {
    //                                 console.log("Pushed");
    //                                 done();
    //                             });
    //                         });
    //
    //                 });
    //         }).catch(done);
    // }).timeout(15000);

    it("should clone and add file in new branch then raise PR", done => {
        GitCommandGitProject.cloned(bbCreds,
            new BitBucketRepoRef("springrod", "austin", "master"))
            .then(bp => {
                bp.addFileSync("Thing", "1");
                bp.commit("Added Thing1")
                    .then(ar => {
                        bp.createBranch("thing1")
                            .then(() => {
                                bp.push()
                                    .then(() => {
                                        bp.raisePullRequest("Add a thing", "Dr Seuss is fun")
                                            .then(() => {
                                                done();
                                            });
                                    });
                            });

                    });
            }).catch(done);
    }).timeout(15000);

    it("add a file, init and commit, then push to new remote repo", function (done) {
        this.retries(5);

        const p = tempProject();
        p.addFileSync("README.md", "Here's the readme for my new repo");

        const repo = `test-repo-2-${new Date().getTime()}`;

        const gp: GitProject = GitCommandGitProject.fromProject(p, bbCreds);
        const owner = "springrod";

        gp.init()
            .then(() => gp.createAndSetRemote(
                new BitBucketRepoRef(owner, repo),
                "Thing1", TestRepositoryVisibility))
            .then(() => gp.commit("Added a README"))
            .then(() => gp.push()
                .then(() => deleteRepoIfExists({owner, repo})),
            ).catch(err => deleteRepoIfExists({owner, repo})
            .then(() => Promise.reject(err))).then(() => done(), done);

    }).timeout(16000);

});

export function deleteRepoIfExists(ownerAndRepo: { owner: string, repo: string }): Promise<any> {
    return Promise.resolve();
    // console.debug("Cleanup: deleting " + ownerAndRepo.repo);
    // const config = {
    //     headers: {
    //         Authorization: `token ${GitHubToken}`,
    //     },
    // };
    // const url = `${GitHubDotComBase}/repos/${ownerAndRepo.owner}/${ownerAndRepo.repo}`;
    // return axios.delete(url, config)
    //     .catch(err => {
    //         console.error(`error deleting ${ownerAndRepo.repo}, ignoring. ${err.response.status}`);
    //     });
}
