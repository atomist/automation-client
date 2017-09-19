import "mocha";
import { clone } from "../../../src/project/git/GitLoader";

import * as assert from "power-assert";
import { GitHubToken } from "../../atomist.config";

describe("GitLoader", () => {

    it("should clone simple project", done => {
        clone(GitHubToken, "atomist", "microgrammar")
            .then(p => {
                const f = p.findFileSync("package.json");
                assert(f.getContentSync());
                done();
            }).catch(err => {
            console.log("ERROR: " + JSON.stringify(err));
        });
    }).timeout(10000);

});
