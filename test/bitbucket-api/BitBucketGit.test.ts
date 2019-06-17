import { BasicAuthCredentials } from "../../lib/operations/common/BasicAuthCredentials";
import { BitBucketRepoRef } from "../../lib/operations/common/BitBucketRepoRef";
import { GitCommandGitProject } from "../../lib/project/git/GitCommandGitProject";
import { GitProject } from "../../lib/project/git/GitProject";
import { TestRepositoryVisibility } from "../credentials";
import { tempProject } from "../project/utils";
import {
    BitBucketCredentials,
    doWithNewRemote,
    skipBitBucketTests,
} from "./BitBucketHelpers";

describe("BitBucket support", () => {

    before(function() {
        if (skipBitBucketTests()) {
            this.skip();
        }
    });

    it("should clone", done => {
        GitCommandGitProject.cloned(BitBucketCredentials,
            new BitBucketRepoRef("jessitron", "poetry", "master"))
            .then(bp => bp.gitStatus())
            .then(done, done);
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
