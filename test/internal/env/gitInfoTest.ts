import * as appRoot from "app-root-path";
import * as stringify from "json-stringify-safe";
import "mocha";
import * as assert from "power-assert";
import * as tmp from "tmp-promise";
import { obtainGitInfo } from "../../../src/internal/env/gitInfo";

describe("gitInfo", () => {

    it("verify correct git info", done => {
        obtainGitInfo(appRoot.path)
            .then(info => {
                console.log(stringify(info));
                assert(info.branch);
                assert(info.repository);
                assert(info.sha);
                done();
            });

    }).timeout(5000);

    it("verify git info fails for non-git repo path", done => {
        tmp.dir()
            .then(dir => {
                return obtainGitInfo(dir);
            })
            .catch(err => done());

    }).timeout(5000);

});
