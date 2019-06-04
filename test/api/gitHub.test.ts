import * as assert from "power-assert";
import {
    createCommitComment,
    deepLink,
    fileContent,
    hasFile,
} from "../../lib/util/gitHub";
import { SeedRepoRef } from "../credentials";
import {
    GitHubToken,
} from "./apiUtils";

describe("gitHubUtils", () => {

    describe("deepLink", () => {

        it("creates a valid link with line number", () => {
            const href = deepLink(SeedRepoRef, {
                path: "pom.xml",
                lineFrom1: 6,
                offset: -1,
            });
            assert(!!href);
            assert(href.includes("#L6"));
        });

        it("creates a valid link without line number", () => {
            const href = deepLink(SeedRepoRef, {
                path: "pom.xml",
                offset: -1,
            });
            assert(!!href);
            assert(!href.includes("#L"));
        });

        it("copes without defined source location", () => {
            const href = deepLink(SeedRepoRef, undefined);
            assert(!!href);
            assert(!href.includes("#L"));
        });

    });

    describe("hasFile", () => {

        it("check an existing file", async () => {
            assert(await hasFile(GitHubToken, SeedRepoRef.owner, SeedRepoRef.repo, "pom.xml"));
        }).timeout(8000);

        it("check a non-existing file", async () => {
            assert(!await hasFile(GitHubToken, SeedRepoRef.owner, SeedRepoRef.repo, "the/quick/brown/foxpom.xml"));
        }).timeout(8000);

        it("check an existing nested file", async () => {
            assert(await hasFile(GitHubToken, SeedRepoRef.owner, SeedRepoRef.repo,
                "/src/main/java/com/atomist/spring/SpringRestSeedApplication.java"));
        }).timeout(8000);
    });

    describe("fileContent", () => {

        it("get content of an existing file", async () => {
            const c = await fileContent(GitHubToken, SeedRepoRef.owner, SeedRepoRef.repo, "pom.xml");
            assert(c.includes("spring-boot"));
        }).timeout(8000);

    });

    describe("comment", () => {

        // Skipped as we don't need this functionality yet and there's no cleanup
        it.skip("comment with absolute line number", done => {
            hasFile(GitHubToken, SeedRepoRef.owner, SeedRepoRef.repo, "README.md")
                .then(() => {
                    createCommitComment(GitHubToken, SeedRepoRef, {
                        body: "Not great",
                        path: "README.md",
                        position: 2,
                    })
                        .then(r => {
                            done();
                        }).catch(done);
                });
        });

    });

});
