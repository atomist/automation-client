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
                assert(info.branch);
                assert(info.repository);
                assert(info.sha);
            }).then(() => done(), done);

    });

    it("verify git info fails for non-git repo path", done => {
        tmp.dir({ unsafeCleanup: true })
            .then(dir => {
                return obtainGitInfo(dir.path)
                    .then(() => assert(false, "succeeded"), err => assert(true, `failed: ${err.message}`))
                    .then(() => dir.cleanup());
            })
            .then(() => done(), done);

    });

});
