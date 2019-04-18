import * as assert from "power-assert";
import { BitBucketRepoRef } from "../../lib/operations/common/BitBucketRepoRef";
import { generate } from "../../lib/operations/generate/generatorUtils";
import { RemoteGitProjectPersister } from "../../lib/operations/generate/remoteGitProjectPersister";
import { GitCommandGitProject } from "../../lib/project/git/GitCommandGitProject";
import {
    deleteOrIgnore,
    tempRepoName,
} from "../api/apiUtils";
import {
    BitBucketCredentials,
    BitBucketUser,
    skipBitBucketTests,
} from "./BitBucketHelpers";

describe("BitBucket generator end to end", () => {

    before(function() {
        if (skipBitBucketTests()) {
            this.skip();
        }
    });

    it("should create a new BitBucket repo using generate function", function(done) {
        this.retries(3);
        const repoName = tempRepoName();
        const targetRepo = new BitBucketRepoRef(BitBucketUser, repoName);
        const cleanupDone = (err: Error | void = null) => {
            deleteOrIgnore(targetRepo, BitBucketCredentials).then(() => done(err));
        };

        const clonedSeed = GitCommandGitProject.cloned(BitBucketCredentials,
            new BitBucketRepoRef("springrod", "spring-rest-seed"));

        generate(clonedSeed, undefined, BitBucketCredentials,
            p => Promise.resolve(p), RemoteGitProjectPersister,
            targetRepo)
            .then(result => {
                assert(result.success);
                // Check the repo
                GitCommandGitProject.cloned(BitBucketCredentials, targetRepo)
                    .then(p => {
                        assert(p.findFileSync("pom.xml") !== undefined);
                    });
            }).then(() => cleanupDone(), cleanupDone);
    }).timeout(20000);

});
