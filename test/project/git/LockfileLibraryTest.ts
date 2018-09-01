import "mocha";
import * as assert from "power-assert";
import lockfile = require("proper-lockfile");
import {
    LockAcquired,
    pleaseLock,
} from "../../../src/spi/clone/CachingDirectoryManager";

describe("exploratory tests for proper-locking", () => {
    it("should be able to release a lock", done => {
        lockfile.lock("docs", (err, release) => {
            if (err) {
                console.log("unable to get the lock");
                done(err);
            } else {
                console.log("let me now release the lock");
                release();
                done();
            }
        });
    });

    it("does not let you lock a file that does not exist, sadly", done => {
        pleaseLock("file-that-does-not-exist")
            .then(result => {
                assert.fail("I didn't think that would work" + result);
            }, err => {
                assert(err.code === "ENOENT");
            })
            .then(() => done(), done);
    });

    it("should be able to release a lock in a promise", done => {
        pleaseLock("docs").then(result => {
            if (result.success) {
                console.log("let me now release the lock");
                return result.release();
            }
        }).then(done, done);
    });

    it("should not be able to lock a file twice", done => {
        pleaseLock("docs")
            .then(result => {
                assert(result.success);
                return pleaseLock("docs")
                    .then(releaseAgain => {
                        if (releaseAgain.success) {
                            assert.fail("acquired lock twice");
                        } else {
                            // good
                            return (result as LockAcquired).release();
                        }
                    });
            })
            .then(done, done);
    });

});
