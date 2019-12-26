import * as assert from "power-assert";
import lockfile = require("proper-lockfile");
import {
    LockAcquired,
    pleaseLock,
} from "../../../lib/spi/clone/CachingDirectoryManager";

describe("exploratory tests for proper-locking", () => {
    it("should be able to release a lock", done => {
        lockfile.lock("docs")
            .then(release => {
                release();
                done();
            })
            .catch(err => {
                done(err);
            });
    });

    it("does not let you lock a file that does not exist, sadly", done => {
        pleaseLock("file-that-does-not-exist")
            .then(result => {
                assert.fail("I didn't think that would work" + result);
            }, err => {
                assert(err.code === "ENOENT");
            })
            .then(done, done);
    });

    it("should be able to release a lock in a promise", done => {
        pleaseLock("docs").then(result => {
            if (result.success) {
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
