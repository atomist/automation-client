import "mocha";

import * as assert from "power-assert";

import { AllFiles } from "../../../src/project/FileGlobs";
import { InMemoryProject } from "../../../src/project/mem/InMemoryProject";
import { deleteFiles, doWithFiles, fileExists, saveFromFiles } from "../../../src/project/util/projectUtils";
import { tempProject } from "../Utils";

describe("projectUtils", () => {

    it("exists: not found", done => {
        const t = tempProject();
        t.addFileSync("Thing", "1");
        fileExists(t, AllFiles, f => f.name === "nonsense")
            .then(yes => {
                assert(!yes);
                done();
            }).catch(done);
    });

    it("exists: found", done => {
        const t = tempProject();
        t.addFileSync("Thing", "1");
        fileExists(t, AllFiles, f => f.name === "Thing")
            .then(yes => {
                assert(yes);
                done();
            }).catch(done);
    });

    it("saveFromFiles", done => {
        const t = tempProject();
        t.addFileSync("Thing", "1");
        saveFromFiles<string>(t, AllFiles, f => {
            return f.path;
        })
            .then(gathered => {
                assert(gathered.length === 1);
                assert(gathered[0] === "/Thing");
                done();
            }).catch(done);
    });

    it("withFiles: run", done => {
        const t = tempProject();
        t.addFileSync("Thing", "1");
        doWithFiles(t, AllFiles, f => {
            f.recordSetContent(f.getContentSync() + "2");
        }).run()
            .then(files => {
                assert(files.length === 1);
                const f = t.findFileSync("Thing");
                assert(f.getContentSync() === "12");
                done();
            }).catch(done);
    });

    it("withFiles: defer", done => {
        const t = tempProject();
        t.addFileSync("Thing", "1");
        doWithFiles(t, AllFiles, f => {
            f.recordSetContent(f.getContentSync() + "2");
        }).defer();
        assert(t.findFileSync("Thing").getContentSync() === "1");

        t.flush()
            .then(files => {
                const f = t.findFileSync("Thing");
                assert(f.getContentSync() === "12");
                done();
            }).catch(done);
    });

    it("withFiles: run with promise", done => {
        const t = tempProject();
        t.addFileSync("Thing", "1");
        doWithFiles(t, AllFiles, f => {
            return f.setContent(f.getContentSync() + "2");
        }).run()
            .then(files => {
                assert(files.length === 1);
                const f = t.findFileSync("Thing");
                assert(f.getContentSync() === "12");
                done();
            }).catch(done);
    });

    it("deleteFiles deletes none", done => {
        const t = tempProject();
        t.addFileSync("Thing", "1");
        deleteFiles(t, AllFiles, f => false)
            .run()
            .then(count => {
                assert(count === 0);
                done();
            }).catch(done);
    });

    it("deleteFiles: run deletes 2", done => {
        const t = tempProject();
        t.addFileSync("Thing", "1");
        t.addFileSync("config/Thing", "1");
        deleteFiles(t, "**/Thing", f => true)
            .run()
            .then(count => {
                assert(count === 2, `Only deleted ${count}`);
                done();
            }).catch(done);
    });

    it("deleteFiles: defer deletes 2", done => {
        const t = new InMemoryProject("name");
        t.addFileSync("Thing", "1");
        t.addFileSync("config/Thing", "1");
        deleteFiles(t, "**/Thing", f => true).defer();
        assert(t.fileCount === 2);
        t.flush()
            .then(count => {
                assert(t.fileCount === 0);
                done();
            }).catch(done);
    });

    it("deleteFiles: run deletes conditionally", done => {
        const t = tempProject();
        t.addFileSync("Thing", "1");
        t.addFileSync("config/Thing", "1");
        deleteFiles(t, "**/Thing", f => f.path.includes("config"))
            .run()
            .then(count => {
                assert(count === 1, `Only deleted ${count}`);
                done();
            }).catch(done);
    });

    it("deleteFiles: defer deletes conditionally", done => {
        const t = new InMemoryProject("name");
        t.addFileSync("Thing", "1");
        t.addFileSync("config/Thing", "1");
        deleteFiles(t, "**/Thing", f => f.path.includes("config")).defer();
        assert(t.fileCount === 2);
        t.flush()
            .then(_ => {
                assert(t.fileCount === 1);
                done();
            }).catch(done);
    });

});
