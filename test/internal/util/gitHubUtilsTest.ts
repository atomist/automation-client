import "mocha";

import * as assert from "power-assert";
import { fileContent, hasFile } from "../../../src/util/gitHub";
import { GitHubToken } from "../../atomist.config";

describe("gitHubUtils", () => {

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

    it("get content of an existing file", done => {
        fileContent(GitHubToken, "atomist-seeds", "spring-rest-seed", "pom.xml")
            .then(r => {
                assert(r.includes("spring-boot"), r);
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
