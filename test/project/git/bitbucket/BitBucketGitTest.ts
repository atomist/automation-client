import { BitBucketCredentials, BitBucketRepoRef } from "../../../../src/operations/common/BitBucketRepoRef";
import { GitCommandGitProject } from "../../../../src/project/git/GitCommandGitProject";

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

});
