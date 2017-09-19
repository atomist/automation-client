import "mocha";

import * as fs from "fs";
import * as assert from "power-assert";
import { LocalRepoLoader } from "../../../src/operations/common/localRepoLoader";

import * as tmp from "tmp";
import { twoTierDirectoryRepoFinder } from "../../../src/operations/common/localRepoFinder";

describe("twoTierRepoFinder & LocalRepoLoader", () => {

    it("finds in local directories", done => {
        const dir: string = tmp.dirSync().name;
        const owner = "atomist";
        const repo = "foo";
        const ownerLevel = dir + "/" + owner;
        fs.mkdirSync(ownerLevel);
        fs.mkdirSync(ownerLevel + "/" + repo);
        twoTierDirectoryRepoFinder(dir)(null)
            .then(ids => {
                assert(ids.length === 1);
                assert(ids[0].repo === repo);
                assert(ids[0].owner === owner);
                done();
            });
    });

    it("loads projects from local finder", done => {
        const dir = tmp.dirSync().name;
        const owner = "atomist";
        const repo = "foo";
        const ownerLevel = dir + "/" + owner;
        fs.mkdirSync(ownerLevel);
        fs.mkdirSync(ownerLevel + "/" + repo);
        fs.writeFileSync(ownerLevel + "/" + repo + "/thing", "1");
        twoTierDirectoryRepoFinder(dir)(null)
            .then(ids => {
                assert(ids.length === 1);
                assert(ids[0].repo === repo);
                assert(ids[0].owner === owner);
                LocalRepoLoader(ids[0]).then(p => {
                    assert(p.findFileSync("thing").getContentSync() === "1");
                    done();
                });
            });
    });

});
