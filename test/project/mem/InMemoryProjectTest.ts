import "mocha";

import * as assert from "power-assert";

import { File } from "../../../src/project/File";
import { AllFiles } from "../../../src/project/fileGlobs";
import { InMemoryProject } from "../../../src/project/mem/InMemoryProject";
import { toPromise } from "../../../src/project/util/projectUtils";

describe("InMemoryProject", () => {

    it("findFileSync: existing file", () => {
        const thisProject = InMemoryProject.of({ path: "package.json", content: "{ node: true }" });
        const f = thisProject.findFileSync("package.json");
        assert(f.getContentSync());
        assert(f.getContentSync().indexOf("node") !== -1);
    });

    it("findFileSync: no such file", () => {
        const thisProject = InMemoryProject.of({ path: "package.json", content: "{ node: true }" });
        const f = thisProject.findFileSync("xxxxpackage.json");
        assert(f === undefined);
    });

    it("getFile: existing file", async () => {
        const thisProject = InMemoryProject.of({ path: "package.json", content: "{ node: true }" });
        const f = await thisProject.getFile("package.json");
        const content = await f.getContent();
        assert(content.indexOf("node") !== -1);
    });

    it("getFile: no such file", async () => {
        const thisProject = InMemoryProject.of({ path: "package.json", content: "{ node: true }" });
        const f = await thisProject.getFile("xxxxpackage.json");
        assert(f === undefined);
    });

    it("fileExistsSync: existing file", () => {
        const thisProject = InMemoryProject.of({ path: "package.json", content: "{ node: true }" });
        assert(thisProject.fileExistsSync("package.json"));
    });

    it("fileExistsSync: no such file", () => {
        const thisProject = InMemoryProject.of({ path: "package.json", content: "{ node: true }" });
        assert(!thisProject.fileExistsSync("xxxxpackage.json"));
    });

    it("files returns enough files", done => {
        const thisProject = InMemoryProject.of(
            { path: "package.json", content: "{ node: true }" },
            { path: "package-lock.json", content: "{ node: true }" },
        );

        assert(toPromise(thisProject.streamFiles())
            .then(files => {
                assert(files.length === 2);
                done();
            }).catch(done));
    });

    it("streamFiles returns enough files", done => {
        let count = 0;
        const thisProject = InMemoryProject.of(
            { path: "package.json", content: "{ node: true }" },
            { path: "package-lock.json", content: "{ node: true }" },
        );
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
        const thisProject = InMemoryProject.of(
            { path: "config/thing.js", content: "{ node: true }" },
            { path: "config/other.ts", content: "{ node: true }" },
            { path: "notconfig/other.ts", content: "{ node: true }" },
        );
        thisProject.streamFiles("config/**")
            .on("data", (f: File) => {
                // console.log(`File path is [${f.path}]`);
                assert(f.name);
                count++;
            },
        ).on("end", () => {
            assert.equal(count, 2);
            done();
        });
    });

    it("streamFiles excludes .git by default", done => {
        let count = 0;
        const thisProject = InMemoryProject.of(
            { path: "config/thing.js", content: "{ node: true }" },
            { path: "config/other.ts", content: "{ node: true }" },
            { path: "notconfig/other.ts", content: "{ node: true }" },
            { path: ".git/junk", content: "whatever"},
        );
        thisProject.streamFiles(AllFiles)
            .on("data", (f: File) => {
                    // console.log(`File path is [${f.path}]`);
                    assert(f.name);
                    count++;
                },
            ).on("end", () => {
            assert.equal(count, 3);
            done();
        });
    });

    it("streamFiles excludes nested .git and node_modules by default", done => {
        let count = 0;
        const thisProject = InMemoryProject.of(
            { path: "config/thing.js", content: "{ node: true }" },
            { path: "config/other.ts", content: "{ node: true }" },
            { path: "notconfig/other.ts", content: "{ node: true }" },
            { path: "nested/.git/junk", content: "whatever"},
            { path: "sub/project/node_modules/thing", content: "whatever"},
        );
        thisProject.streamFiles(AllFiles)
            .on("data", (f: File) => {
                    // console.log(`File path is [${f.path}]`);
                    assert(f.name);
                    count++;
                },
            ).on("end", () => {
            assert.equal(count, 3);
            done();
        });
    });

    it("streamFiles respects negative globs", done => {
        let count = 0;
        const thisProject = InMemoryProject.of(
            { path: "config/thing.js", content: "{ node: true }" },
            { path: "config/other.ts", content: "{ node: true }" },
            { path: "config/exclude.ts", content: "{ node: true }" },
        );
        thisProject.streamFilesRaw(["config/**", "!**/exclude.*"], {})
            .on("data", (f: File) => {
                    // console.log(`File path is [${f.path}]`);
                    assert(f.name);
                    count++;
                },
            ).on("end", () => {
            assert.equal(count, 2);
            done();
        });
    });

    it("files returns well-known files", done => {
        const thisProject = InMemoryProject.of(
            { path: "package.json", content: "{ node: true }" },
            { path: "package-lock.json", content: "{ node: true }" },
        );
        toPromise(thisProject.streamFiles())
            .then(files => {
                assert(files.some(f => f.name === "package.json"));
                done();
            }).catch(done);
    });

    it("glob returns well-known file", done => {
        const thisProject = InMemoryProject.of(
            { path: "package.json", content: "{ node: true }" },
            { path: "package-lock.json", content: "{ node: true }" },
        );
        toPromise(thisProject.streamFiles("package.json"))
            .then(files => {
                assert(files.some(f => f.name === "package.json"));
                done();
            }).catch(done);
    });

    it("file count", done => {
        const thisProject = InMemoryProject.of(
            { path: "package.json", content: "{ node: true }" },
            { path: "package-lock.json", content: "{ node: true }" },
        );
        thisProject.totalFileCount().then(num => {
            assert(num > 0);
            done();
        }).catch(done);
    }).timeout(5000);

    it("changes content", done => {
        const p = new InMemoryProject();
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
        const p = new InMemoryProject();
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
        const p = new InMemoryProject();
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
        const p = new InMemoryProject();
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
        const p = new InMemoryProject();
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

    const deleteTestFiles = [
        { path: "README.md", content: "# This project\n" },
        { path: "LICENSE", content: "The license.\n" },
        { path: "CODE_OF_CONDUCT.md", content: "The code.\n" },
        { path: "CONTRIBUTING.md", content: "Contribute.\n" },
        { path: "src/main/java/Command.java", content: "package main" },
        { path: ".travis/travis-build.bash", content: "#!/bin/bash\n" },
        { path: ".travis/some.patch", content: "--- a/c.d\n+++ b/c.d\n" },
        { path: "src/test/scala/CommandTest.scala", content: "package main" },
        { path: ".travis-save/travis-build.bash", content: "#!/bin/bash\necho save me\n" },
    ];
    const deleteTestDirs = [
        ".travis",
        ".travis-save",
        "src",
        "src/main",
        "src/main/java",
        "src/test",
        "src/test/scala",
    ];

    it("should sync delete a file", () => {
        const p = InMemoryProject.of(...deleteTestFiles);
        const paths = deleteTestFiles.map(f => f.path);
        const remove = ["CODE_OF_CONDUCT.md"];
        const remain = paths.filter(f => !remove.includes(f));
        remove.forEach(f => p.deleteFileSync(f));
        remain.forEach(f => assert(p.fileExistsSync(f)));
        remove.forEach(f => assert(!p.fileExistsSync(f)));
        deleteTestDirs.forEach(d => assert(p.directoryExistsSync(d)));
    });

    it("should async delete a file", done => {
        const p = InMemoryProject.of(...deleteTestFiles);
        const paths = deleteTestFiles.map(f => f.path);
        const remove = ["CODE_OF_CONDUCT.md"];
        const remain = paths.filter(f => !remove.includes(f));
        Promise.all(remove.map(f => p.deleteFile(f)))
            .then(() => {
                remain.forEach(f => assert(p.fileExistsSync(f)));
                remove.forEach(f => assert(!p.fileExistsSync(f)));
                deleteTestDirs.forEach(d => assert(p.directoryExistsSync(d)));
            })
            .then(done, done);
    });

    it("should sync delete files", () => {
        const p = InMemoryProject.of(...deleteTestFiles);
        const paths = deleteTestFiles.map(f => f.path);
        const remove = ["CODE_OF_CONDUCT.md", ".travis/some.patch"];
        const remain = paths.filter(f => !remove.includes(f));
        remove.forEach(f => p.deleteFileSync(f));
        remain.forEach(f => assert(p.fileExistsSync(f)));
        remove.forEach(f => assert(!p.fileExistsSync(f)));
        deleteTestDirs.forEach(d => assert(p.directoryExistsSync(d)));
    });

    it("should async delete files", done => {
        const p = InMemoryProject.of(...deleteTestFiles);
        const paths = deleteTestFiles.map(f => f.path);
        const remove = ["CODE_OF_CONDUCT.md", ".travis/some.patch"];
        const remain = paths.filter(f => !remove.includes(f));
        Promise.all(remove.map(f => p.deleteFile(f)))
            .then(() => {
                remain.forEach(f => assert(p.fileExistsSync(f)));
                remove.forEach(f => assert(!p.fileExistsSync(f)));
                deleteTestDirs.forEach(d => assert(p.directoryExistsSync(d)));
            })
            .then(done, done);
    });

    it("should sync delete a file and empty directories", () => {
        const p = InMemoryProject.of(...deleteTestFiles);
        const paths = deleteTestFiles.map(f => f.path);
        const remove = ["CODE_OF_CONDUCT.md", "src/main/java/Command.java"];
        const remain = paths.filter(f => !remove.includes(f));
        const removeDirs = ["src/main", "src/main/java"];
        const remainDirs = deleteTestDirs.filter(d => !removeDirs.includes(d));
        remove.forEach(f => p.deleteFileSync(f));
        remain.forEach(f => assert(p.fileExistsSync(f)));
        remove.forEach(f => assert(!p.fileExistsSync(f)));
        remainDirs.forEach(d => assert(p.directoryExistsSync(d)));
        removeDirs.forEach(d => assert(!p.directoryExistsSync(d)));
    });

    it("should async delete a file and empty directories", done => {
        const p = InMemoryProject.of(...deleteTestFiles);
        const paths = deleteTestFiles.map(f => f.path);
        const remove = ["CODE_OF_CONDUCT.md", "src/main/java/Command.java"];
        const remain = paths.filter(f => !remove.includes(f));
        const removeDirs = ["src/main", "src/main/java"];
        const remainDirs = deleteTestDirs.filter(d => !removeDirs.includes(d));
        Promise.all(remove.map(f => p.deleteFile(f)))
            .then(() => {
                remain.forEach(f => assert(p.fileExistsSync(f)));
                remove.forEach(f => assert(!p.fileExistsSync(f)));
                remainDirs.forEach(d => assert(p.directoryExistsSync(d)));
                removeDirs.forEach(d => assert(!p.directoryExistsSync(d)));
            })
            .then(done, done);
    });

    it("should sync delete a directory and its contents", () => {
        const p = InMemoryProject.of(...deleteTestFiles);
        const paths = deleteTestFiles.map(f => f.path);
        const removeDirs = [".travis"];
        const remainDirs = deleteTestDirs.filter(d => !removeDirs.includes(d));
        const remove = [".travis/travis-build.bash", ".travis/some.patch"];
        const remain = paths.filter(f => !remove.includes(f));
        removeDirs.forEach(d => p.deleteDirectorySync(d));
        remain.forEach(f => assert(p.fileExistsSync(f)));
        remove.forEach(f => assert(!p.fileExistsSync(f)));
        remainDirs.forEach(d => assert(p.directoryExistsSync(d)));
        removeDirs.forEach(d => assert(!p.directoryExistsSync(d)));
    });

    it("should async delete a file and empty directories", done => {
        const p = InMemoryProject.of(...deleteTestFiles);
        const paths = deleteTestFiles.map(f => f.path);
        const removeDirs = [".travis"];
        const remainDirs = deleteTestDirs.filter(d => !removeDirs.includes(d));
        const remove = [".travis/travis-build.bash", ".travis/some.patch"];
        const remain = paths.filter(f => !remove.includes(f));
        Promise.all(removeDirs.map(d => p.deleteDirectory(d)))
            .then(() => {
                remain.forEach(f => assert(p.fileExistsSync(f)));
                remove.forEach(f => assert(!p.fileExistsSync(f)));
                remainDirs.forEach(d => assert(p.directoryExistsSync(d)));
                removeDirs.forEach(d => assert(!p.directoryExistsSync(d)));
            })
            .then(done, done);
    });

});
