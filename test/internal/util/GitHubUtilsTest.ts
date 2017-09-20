import "mocha";

import * as assert from "power-assert";
import { hasFile } from "../../../src/internal/util/gitHub";
import { GitHubToken } from "../../atomist.config";

describe("GitHubUtils", () => {

    it("check an existing file", done => {
        hasFile(GitHubToken, "atomist-seeds", "spring-rest-seed", "pom.xml")
            .then(r => {
                assert(r === true);
                done();
            }).catch(err => console.log(err));
    }).timeout(5000);

    it("check a non-existing file", done => {
        hasFile(GitHubToken, "atomist-seeds", "spring-rest-seed", "the/quick/brown/foxpom.xml")
            .then(r => {
                assert(r === false);
                done();
            });
    }).timeout(5000);

    it("check an existing nested file", done => {
        hasFile(GitHubToken, "atomist-seeds", "spring-rest-seed",
            "/src/main/java/com/atomist/spring/SpringRestSeedApplication.java")
            .then(r => {
                assert(r === true);
                done();
            });
    }).timeout(5000);

});
