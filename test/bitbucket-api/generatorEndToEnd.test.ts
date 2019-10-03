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

    before(function(): void {
        if (skipBitBucketTests()) {
            // tslint:disable-next-line:no-invalid-this
            this.skip();
        }
    });
    let cleanup: () => Promise<any>;
    after(async () => {
        if (cleanup) {
            await cleanup();
        }
    });

    it("should create a new BitBucket repo using generate function", async () => {
        // tslint:disable-next-line:no-invalid-this
        this.retries(3);
        const repoName = tempRepoName();
        const targetRepo = new BitBucketRepoRef(BitBucketUser, repoName);
        cleanup = () => deleteOrIgnore(targetRepo, BitBucketCredentials);
        const clonedSeed = GitCommandGitProject.cloned(BitBucketCredentials, new BitBucketRepoRef("springrod", "spring-rest-seed"));
        const result = await generate(clonedSeed, undefined, BitBucketCredentials, gp => Promise.resolve(gp), RemoteGitProjectPersister, targetRepo);
        assert(result.success);
        const p = await GitCommandGitProject.cloned(BitBucketCredentials, targetRepo);
        assert(await p.findFile("pom.xml"));
    }).timeout(20000);

});
