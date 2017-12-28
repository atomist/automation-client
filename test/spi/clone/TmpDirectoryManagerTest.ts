import "mocha";

import * as fs from "fs-extra";
import * as assert from "power-assert";
import { runCommand } from "../../../src/action/cli/commandLine";
import { TmpDirectoryManager } from "../../../src/spi/clone/tmpDirectoryManager";

describe("the TmpDirectoryManager", () => {

    it("deletes the directory after it's done", done => {
        const subject = TmpDirectoryManager;

        subject.directoryFor("anOwner", "aRepo", "abranch", { keep: false })
            .then(cdi => {
                const suppliedDirectory = cdi.path;
                return fs.stat(suppliedDirectory) // if this succeeds, it exists
                    .then(() =>
                        runCommand("git init", { cwd: suppliedDirectory })) // make it a little difficult
                    .then(() => cdi.release())
                    .then(() => fs.stat(suppliedDirectory))
                    .then(() => {
                        assert.fail("Should have been deleted: " + suppliedDirectory);
                    }, err => {
                        assert(err.code === "ENOENT", "directory should not exists");
                    });
            })
            .then(() => done(), done);
        return;
    });

    it("does not delete the directory if keep is true", done => {
        const subject = TmpDirectoryManager;

        subject.directoryFor("anOwner", "aRepo", "abranch", { keep: true })
            .then(cdi => {
                const suppliedDirectory = cdi.path;
                return fs.stat(suppliedDirectory)
                    .then(stats => cdi.release())
                    .then(() => fs.stat(suppliedDirectory))
                    .catch(err => {
                        if (err.code === "ENOENT") {
                            assert.fail("directory has been deleted boo " + suppliedDirectory);
                        } else {
                            throw err;
                        }
                    });
            })
            .then(() => done(), done);
        return;
    });

});
