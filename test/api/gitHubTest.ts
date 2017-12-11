import "mocha";
import * as assert from "power-assert";

import { GitHubRepoRef } from "../../src/operations/common/GitHubRepoRef";
import { createCommitComment, deepLink, fileContent, hasFile } from "../../src/util/gitHub";

function barf(): string {
    throw new Error("<please set GITHUB_TOKEN env variable>");
}

export const GitHubToken: string = process.env.GITHUB_TOKEN || barf();

export const Creds = { token: GitHubToken };

export const SlackTeamId = "T095SFFBK";

describe("gitHubUtils", () => {

    describe("deepLink", () => {

        it("creates a valid link with line number", () => {
            const target = new GitHubRepoRef("atomist-seeds", "spring-rest-seed", "1c097a4897874b08e3b3ddb9675a1ac460ae46de");
            const href = deepLink(target, {
                path: "pom.xml",
                lineFrom1: 6,
                offset: -1,
            });
            assert(!!href);
            assert(href.includes("#L6"));
        });

        it("creates a valid link without line number", () => {
            const target = new GitHubRepoRef("atomist-seeds", "spring-rest-seed", "1c097a4897874b08e3b3ddb9675a1ac460ae46de");
            const href = deepLink(target, {
                path: "pom.xml",
                offset: -1,
            });
            assert(!!href);
            assert(!href.includes("#L"));
        });

        it("copes without defined source location", () => {
            const target = new GitHubRepoRef("atomist-seeds", "spring-rest-seed", "1c097a4897874b08e3b3ddb9675a1ac460ae46de");
            const href = deepLink(target, undefined);
            assert(!!href);
            assert(!href.includes("#L"));
        });

    });

    describe("hasFile", () => {

        it("check an existing file", done => {
            hasFile(GitHubToken, "atomist-seeds", "spring-rest-seed", "pom.xml")
                .then(r => {
                    assert(r === true);
                    done();
                }).catch(done);
        }).timeout(5000);

        it("check a non-existing file", done => {
            hasFile(GitHubToken, "atomist-seeds", "spring-rest-seed", "the/quick/brown/foxpom.xml")
                .then(r => {
                    assert(r === false);
                    done();
                }).catch(done);
        }).timeout(5000);

        it("check an existing nested file", done => {
            hasFile(GitHubToken, "atomist-seeds", "spring-rest-seed",
                "/src/main/java/com/atomist/spring/SpringRestSeedApplication.java")
                .then(r => {
                    assert(r === true);
                    done();
                }).catch(done);
        }).timeout(5000);
    });

    describe("fileContent", () => {

        it("get content of an existing file", done => {
            fileContent(GitHubToken, "atomist-seeds", "spring-rest-seed", "pom.xml")
                .then(r => {
                    assert(r.includes("spring-boot"), r);
                    done();
                }).catch(done);
        }).timeout(5000);

    });

    describe("comment", () => {

        // Skipped as we don't need this functionality yet and there's no cleanup
        it.skip("comment with absolute line number", done => {
            const target = new GitHubRepoRef("atomist-travisorg", "this-repository-exists", "68ffbfaa4b6ddeff563541b4b08d3b53060a51d8");
            hasFile(GitHubToken, target.owner, target.repo, "README.md")
                .then(() => {
                    createCommitComment(GitHubToken, target, {
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
