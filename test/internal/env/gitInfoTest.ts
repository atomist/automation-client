import * as appRoot from "app-root-path";
import "mocha";
import * as assert from "power-assert";
import * as tmp from "tmp";
import { promisify } from "util";
import { obtainGitInfo } from "../../../src/internal/env/gitInfo";

describe("gitInfo", () => {

    it("verify correct git info", done => {
        obtainGitInfo(appRoot.path)
            .then(info => {
                console.log(JSON.stringify(info));
                assert(info.branch);
                assert(info.repository);
                assert(info.sha);
                done();
            });

    }).timeout(5000);

    it("verify git info fails for non-git repo path", done => {
        const tmpDir = promisify(tmp.dir);
        tmpDir()
            .then(dir => {
                return obtainGitInfo(dir);
            })
            .catch(err => done());

    }).timeout(5000);

});
