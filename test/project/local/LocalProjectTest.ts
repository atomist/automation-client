import "mocha";

import * as appRoot from "app-root-path";
import * as assert from "power-assert";
import * as tmp from "tmp";

import { LocalProject } from "../../../src/project/local/LocalProject";

import { File } from "../../../src/project/File";

import { AllFiles, ExcludeNodeModules } from "../../../src/project/FileGlobs";
import { NodeFsLocalProject } from "../../../src/project/local/NodeFsLocalProject";
import { InMemoryProject } from "../../../src/project/mem/InMemoryProject";
import { toPromise } from "../../../src/project/util/projectUtils";
import { tempProject } from "../Utils";

describe("LocalProject", () => {

    const thisProject: LocalProject = new NodeFsLocalProject("test", appRoot);

    it("rejects no such directory", () => {
        assert.throws(() => new NodeFsLocalProject("name", "This/is/complete/nonsense"), err => true);
    });

    it("copies other project", done => {
        const t = InMemoryProject.of("name", [
            {path: "package.json", content: "{ node }"},
            {path: "some/nested/thing", content: "{ node }"},
        ]);
        const baseDir: string = tmp.dirSync().name;
        NodeFsLocalProject.copy(t, baseDir).then(p => {
            assert(p.baseDir === baseDir + "/name");
            const f = p.findFileSync("package.json");
            assert(f.getContentSync());
            assert(f.getContentSync().includes("node"));
            assert(p.findFileSync("some/nested/thing"));
            done();
        }).catch(done);
    });

    it("findFileSync: existing file", () => {
        const f = thisProject.findFileSync("package.json");
        assert(f.getContentSync());
        assert(f.getContentSync().indexOf("node") !== -1);
    });

    it("findFileSync: no such file", () => {
        const f = thisProject.findFileSync("xxxxpackage.json");
        assert(f === undefined);
    });

    it("fileExistsSync: existing file", () => {
        assert(thisProject.fileExistsSync("package.json"));
    });

    it("fileExistsSync: no such file", () => {
        assert(!thisProject.fileExistsSync("xxxxpackage.json"));
    });

    it("files returns enough files", done => {
        assert(toPromise(thisProject.streamFiles(AllFiles, ExcludeNodeModules))
            .then(files => {
                assert(files.length > 50);
                done();
            }).catch(done));
    });

    it("streamFiles returns enough files", done => {
        let count = 0;
        thisProject.streamFiles(AllFiles, ExcludeNodeModules)
            .on("data", (f: File) => {
                    assert(f.name.length > 0);
                    assert(f.getContentSync() !== undefined);
                    count++;
                },
            )
            .on("end", () => {
                assert(count > 0);
                done();
            });
    }).timeout(5000);

    it("streamFiles excludes glob non-matches", done => {
        let count = 0;
        const files = [
            {path: "config/thing.js", content: "{ node: true }"},
            {path: "config/other.ts", content: "{ node: true }"},
            {path: "notconfig/other.ts", content: "{ node: true }"},
        ];
        const p = tempProject();
        files.forEach(f => p.addFileSync(f.path, f.content));
        p.streamFiles("config/**")
            .on("data", (f: File) => {
                    assert(f.name);
                    count++;
                },
            ).on("end", () => {
            assert(count === 2, "Found " + count);
            done();
        });
    });

    it("glob returns well-known file", done => {
        toPromise(thisProject.streamFiles("package.json"))
            .then(files => {
                assert(files.some(f => f.name === "package.json"));
                done();
            }).catch(done);
    });

    it("file count", done => {
        thisProject.totalFileCount().then(num => {
            assert(num > 0);
            done();
        }).catch(done);
    }).timeout(7000);

    it("changes content", done => {
        const p = tempProject();
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
        const p = tempProject();
        p.recordAddFile("thing", "1");
        assert(p.dirty);
        p.flush()
            .then(_ => {
                const f2 = p.findFileSync("thing");
                assert(f2);
                done();
            }).catch(done);
    });

    it("adds nested file", done => {
        const p = tempProject();
        p.recordAddFile("config/thing", "1");
        assert(p.dirty);
        p.flush()
            .then(_ => {
                const f2 = p.findFileSync("config/thing");
                assert(f2);
                done();
            }).catch(done);
    });

    it("adds deeply nested file", done => {
        const p = tempProject();
        p.recordAddFile("config/and/more/thing", "1");
        assert(p.dirty);
        p.flush()
            .then(_ => {
                const f2 = p.findFileSync("config/and/more/thing");
                assert(f2);
                done();
            }).catch(done);
    });

    it("deletes file", done => {
        const p = tempProject();
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
