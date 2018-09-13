import * as fs from "fs-extra";
import "mocha";
import * as assert from "power-assert";
import { TmpDirectoryManager } from "../../../lib/spi/clone/tmpDirectoryManager";
import { safeExec } from "../../../lib/util/exec";

describe("the TmpDirectoryManager", () => {

    it("deletes the directory after it's done", done => {
        const subject = TmpDirectoryManager;

        subject.directoryFor("anOwner", "aRepo", "abranch", { keep: false })
            .then(cdi => {
                const suppliedDirectory = cdi.path;
                return fs.stat(suppliedDirectory) // if this succeeds, it exists
                    .then(() =>
                        safeExec("git", ["init"], { cwd: suppliedDirectory })) // make it a little difficult
                    .then(() => cdi.release())
                    .then(() => fs.stat(suppliedDirectory))
                    .then(() => {
                        assert.fail("Should have been deleted: " + suppliedDirectory);
                    }, err => {
                        assert.equal(err.code, "ENOENT", "directory should not exists");
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
