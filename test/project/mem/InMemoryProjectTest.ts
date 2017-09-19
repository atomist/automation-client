import "mocha";

import * as assert from "power-assert";

import { File } from "../../../src/project/File";
import { InMemoryProject } from "../../../src/project/mem/InMemoryProject";
import { toPromise } from "../../../src/project/util/projectUtils";

describe("InMemoryProject", () => {

    it("findFileSync: existing file", () => {
        const thisProject = InMemoryProject.of("name", [{path: "package.json", content: "{ node: true }"}]);
        const f = thisProject.findFileSync("package.json");
        assert(f.getContentSync());
        assert(f.getContentSync().indexOf("node") !== -1);
    });

    it("findFileSync: no such file", () => {
        const thisProject = InMemoryProject.of("name", [{path: "package.json", content: "{ node: true }"}]);
        const f = thisProject.findFileSync("xxxxpackage.json");
        assert(f === undefined);
    });

    it("fileExistsSync: existing file", () => {
        const thisProject = InMemoryProject.of("name", [{path: "package.json", content: "{ node: true }"}]);
        assert(thisProject.fileExistsSync("package.json"));
    });

    it("fileExistsSync: no such file", () => {
        const thisProject = InMemoryProject.of("name", [{path: "package.json", content: "{ node: true }"}]);
        assert(!thisProject.fileExistsSync("xxxxpackage.json"));
    });

    it("files returns enough files", done => {
        const thisProject = InMemoryProject.of("name", [
            {path: "package.json", content: "{ node: true }"},
            {path: "package-lock.json", content: "{ node: true }"},
        ]);

        assert(toPromise(thisProject.streamFiles())
            .then(files => {
                assert(files.length === 2);
                done();
            }).catch(done));
    });

    it("streamFiles returns enough files", done => {
        let count = 0;
        const thisProject = InMemoryProject.of("name", [
            {path: "package.json", content: "{ node: true }"},
            {path: "package-lock.json", content: "{ node: true }"},
        ]);
        thisProject.streamFiles()
            .on("data", (f: File) => {
                    // console.log(`File path is [${f.path}]`);
                    assert(f.name);
                    count++;
                },
            ).on("end", () => {
            assert(count === 2);
            done();
        });
    });

    it("streamFiles excludes glob non-matches", done => {
        let count = 0;
        const thisProject = InMemoryProject.of("name", [
            {path: "config/thing.js", content: "{ node: true }"},
            {path: "config/other.ts", content: "{ node: true }"},
            {path: "notconfig/other.ts", content: "{ node: true }"},
        ]);
        thisProject.streamFiles("config/**")
            .on("data", (f: File) => {
                    // console.log(`File path is [${f.path}]`);
                    assert(f.name);
                    count++;
                },
            ).on("end", () => {
            assert(count === 2, "Found " + count);
            done();
        });
    });

    it("files returns well-known files", done => {
        const thisProject = InMemoryProject.of("name", [
            {path: "package.json", content: "{ node: true }"},
            {path: "package-lock.json", content: "{ node: true }"},
        ]);
        toPromise(thisProject.streamFiles())
            .then(files => {
                assert(files.some(f => f.name === "package.json"));
                done();
            }).catch(done);
    });

    it("glob returns well-known file", done => {
        const thisProject = InMemoryProject.of("name", [
            {path: "package.json", content: "{ node: true }"},
            {path: "package-lock.json", content: "{ node: true }"},
        ]);
        toPromise(thisProject.streamFiles("package.json"))
            .then(files => {
                assert(files.some(f => f.name === "package.json"));
                done();
            }).catch(done);
    });

    it("file count", done => {
        const thisProject = InMemoryProject.of("name", [
            {path: "package.json", content: "{ node: true }"},
            {path: "package-lock.json", content: "{ node: true }"},
        ]);
        thisProject.totalFileCount().then(num => {
            assert(num > 0);
            done();
        }).catch(done);
    }).timeout(5000);

    it("changes content", done => {
        const p = new InMemoryProject("name");
        p.addFileSync("thing", "1");
        const f1 = p.findFileSync("thing");
        assert(f1.getContentSync() === "1");
        f1.recordSetContent("2")
            .flush()
            .then(_ => {
                const f2 = p.findFileSync("thing");
                assert(f2.getContentSync() === "2");
                done();
            }).catch(done);
    });

    it("adds file", done => {
        const p = new InMemoryProject("name");
        p.recordAddFile("thing", "1");
        assert(!p.dirty);
        p.flush()
            .then(_ => {
                const f2 = p.findFileSync("thing");
                assert(f2);
                done();
            }).catch(done);
    });

    it("adds nested file", done => {
        const p = new InMemoryProject("name");
        p.recordAddFile("config/thing", "1");
        assert(!p.dirty);
        p.flush()
            .then(_ => {
                const f2 = p.findFileSync("config/thing");
                assert(f2);
                done();
            }).catch(done);
    });

    it("adds deeply nested file", done => {
        const p = new InMemoryProject("name");
        p.recordAddFile("config/and/more/thing", "1");
        assert(!p.dirty);
        p.flush()
            .then(_ => {
                const f2 = p.findFileSync("config/and/more/thing");
                assert(f2);
                done();
            }).catch(done);
    });

    it("deletes file", done => {
        const p = new InMemoryProject("name");
        p.addFileSync("thing", "1");
        const f1 = p.findFileSync("thing");
        assert(f1.getContentSync() === "1");
        assert(!p.dirty);
        p.recordDeleteFile("thing");
        assert(p.dirty);
        p.flush()
            .then(_ => {
                const f2 = p.findFileSync("thing");
                assert(!f2);
                done();
            }).catch(done);
    });

});
