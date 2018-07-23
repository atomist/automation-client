import * as fs from "fs";
import "mocha";
import * as assert from "power-assert";

import * as tmp from "tmp-promise";
import { twoTierDirectoryRepoFinder } from "../../../src/operations/common/localRepoFinder";
import { LocalRepoLoader } from "../../../src/operations/common/localRepoLoader";

describe("twoTierRepoFinder & LocalRepoLoader", () => {

    it("finds in local directories", done => {
        const tmpDir = tmp.dirSync({ unsafeCleanup: true });
        const dir: string = tmpDir.name;
        const owner = "atomist";
        const repo = "foo0";
        const ownerLevel = dir + "/" + owner;
        fs.mkdirSync(ownerLevel);
        fs.mkdirSync(ownerLevel + "/" + repo);
        twoTierDirectoryRepoFinder(dir)(null)
            .then(ids => {
                assert(ids.length === 1);
                assert(ids[0].repo === repo);
                assert(ids[0].owner === owner);
            })
            .then(() => tmpDir.removeCallback())
            .then(() => done(), done);
    });

    it("loads projects from local finder", done => {
        const tmpDir = tmp.dirSync({ unsafeCleanup: true });
        const dir = tmpDir.name;
        const owner = "atomist";
        const repo = "foo1";
        const ownerLevel = dir + "/" + owner;
        fs.mkdirSync(ownerLevel);
        fs.mkdirSync(ownerLevel + "/" + repo);
        fs.writeFileSync(ownerLevel + "/" + repo + "/thing", "1");
        twoTierDirectoryRepoFinder(dir)(null)
            .then(ids => {
                assert(ids.length === 1);
                assert(ids[0].repo === repo);
                assert(ids[0].owner === owner);
                return LocalRepoLoader(ids[0])
                    .then(p => assert(p.findFileSync("thing").getContentSync() === "1"));
            })
            .then(() => tmpDir.removeCallback())
            .then(() => done(), done);
    });

});
