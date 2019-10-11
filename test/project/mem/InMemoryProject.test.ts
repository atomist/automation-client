import * as micromatch from "micromatch";
import * as path from "path";
import * as assert from "power-assert";

import { File } from "../../../lib/project/File";
import { AllFiles } from "../../../lib/project/fileGlobs";
import { InMemoryFile } from "../../../lib/project/mem/InMemoryFile";
import { InMemoryProject } from "../../../lib/project/mem/InMemoryProject";
import { toPromise } from "../../../lib/project/util/projectUtils";

/* tslint:disable:max-file-line-count */

describe("InMemoryProject", () => {

    describe("getFiles", () => {

        it("all", async () => {
            const p = InMemoryProject.of({
                path: "evil.js",
                content: "const awsLeak = 'AKIAIMW6ASF43DFX57X9'",
            });
            const allFiles = await p.getFiles();
            assert.deepStrictEqual(allFiles.map(f => f.path), ["evil.js"]);
        });

        it("one", async () => {
            const p = InMemoryProject.of({
                path: "evil.js",
                content: "const a = b;",
            });
            const allFiles = await p.getFiles("evil.js");
            assert.deepStrictEqual(allFiles.map(f => f.path), ["evil.js"]);
        });

        it("none", async () => {
            const p = InMemoryProject.of({
                path: "evil.js",
                content: "const a = b;",
            });
            const allFiles = await p.getFiles("xevil.js");
            assert.deepStrictEqual(allFiles.map(f => f.path), []);
        });

        it("simple glob", async () => {
            const p = InMemoryProject.of({
                path: "github/workflows/mine.yml",
                content: "x",
            }, {
                path: "github/workflows/yours.yaml",
                content: "x",
            });
            const allFiles = await p.getFiles("github/workflows/*.y{,a}ml");
            assert.deepStrictEqual(allFiles.map(f => f.path), [
                "github/workflows/mine.yml",
                "github/workflows/yours.yaml"]);
        });

        it("dot glob", async () => {
            const p = InMemoryProject.of(
                { path: ".github/workflows/mine.yml", content: "x" },
                { path: ".git/config", content: "x" },
                { path: ".github/workflows/yours.yaml", content: "x" },
            );
            const allFiles = await p.getFiles(".github/workflows/*.y{,a}ml");
            assert(micromatch.match([".github/workflows/yours.yaml"], ".github/workflows/*.y{,a}ml"));
            const e = [".github/workflows/mine.yml", ".github/workflows/yours.yaml"];
            assert.deepStrictEqual(allFiles.map(f => f.path), e);
        });

        it("nested dot glob", async () => {
            const p = InMemoryProject.of({
                path: "test/.buckconfig",
                content: "x",
            });
            const allFiles = await p.getFiles("**/.buckconfig");
            assert.deepStrictEqual(allFiles.map(f => f.path), [
                "test/.buckconfig"]);
        });

        it("nested dot glob x2", async () => {
            const p = InMemoryProject.of({
                path: "anywhere/.openshift/stuff",
                content: "x",
            });
            const allFiles = await p.getFiles("**/.openshift/*");
            assert.deepStrictEqual(allFiles.map(f => f.path), [
                "anywhere/.openshift/stuff"]);
        });

        it("respects negative globs", async () => {
            const p = InMemoryProject.of(
                { path: "config/thing.js", content: "{ node: true }" },
                { path: "config/other.ts", content: "{ node: true }" },
                { path: "config/exclude.ts", content: "{ node: true }" },
            );
            const paths = ["config/**", "!config/exclude.*"];
            assert(micromatch.match(["config/this.js"], "config/**"));
            assert(micromatch.match(["config/other.ts"], "config/**"));
            assert(micromatch.match(["config/exclude.ts"], "!config/exclude.*"));

            const files = await p.getFiles(paths);
            assert.strictEqual(files.length, 2);
        });

    });

    describe("binaryness", () => {

        it("inline file should be nonbinary by default", async () => {
            const p = InMemoryProject.of({
                path: "evil.js",
                content: "const awsLeak = 'AKIAIMW6ASF43DFX57X9'",
            });
            const f = await p.getFile("evil.js");
            assert(!!f);
            assert.strictEqual(await f.isBinary(), false);
        });

        it("object file should be nonbinary by default", async () => {
            const p = InMemoryProject.of(new InMemoryFile(
                "evil.js",
                "const awsLeak = 'AKIAIMW6ASF43DFX57X9'"));
            const f = await p.getFile("evil.js");
            assert(!!f);
            assert.strictEqual(await f.isBinary(), false);
        });

    });

    describe("findFile", () => {

        it("findFileSync: existing file", () => {
            const p = InMemoryProject.of({ path: "package.json", content: "{ node: true }" });
            const f = p.findFileSync("package.json");
            const c = f.getContentSync();
            assert(c === "{ node: true }");
        });

        it("findFileSync: no such file", () => {
            const p = InMemoryProject.of({ path: "package.json", content: "{ node: true }" });
            const f = p.findFileSync("xxxxpackage.json");
            assert(f === undefined);
        });

        it("findFileSync: not return directory as file", () => {
            const p = InMemoryProject.of({ path: path.join("some", "dir", "file"), content: "x\n" });
            const f = p.findFileSync(path.join("some", "dir"));
            assert(f === undefined);
        });

        it("findFile: existing file", async () => {
            const p = InMemoryProject.of({ path: "package.json", content: "{ node: true }" });
            const f = await p.findFile("package.json");
            const c = f.getContentSync();
            assert(c === "{ node: true }");
        });

        it("findFile: no such file", done => {
            const p = InMemoryProject.of({ path: "package.json", content: "{ node: true }" });
            p.findFile("xxxxpackage.json")
                .then(() => assert.fail("should not have found xxxxpackage.json"), err => {
                    assert(err.message === "File not found at xxxxpackage.json");
                })
                .then(done, done);
        });

        it("findFile: not return directory as file", done => {
            const d = path.join("some", "dir");
            const p = InMemoryProject.of({ path: path.join(d, "file"), content: "x\n" });
            p.findFile(d)
                .then(() => assert.fail("should not have found directory"), err => {
                    assert(err.message === `File not found at ${d}`);
                })
                .then(done, done);
        });

    });

    describe("getFile", () => {

        it("getFile: existing file", async () => {
            const p = InMemoryProject.of({ path: "package.json", content: "{ node: true }" });
            const f = await p.getFile("package.json");
            const c = await f.getContent();
            assert(c === "{ node: true }");
        });

        it("getFile: no such file", async () => {
            const p = InMemoryProject.of({ path: "package.json", content: "{ node: true }" });
            const f = await p.getFile("xxxxpackage.json");
            assert(f === undefined);
        });

        it("getFile: not return directory", async () => {
            const d = path.join("some", "dir");
            const p = InMemoryProject.of({ path: path.join(d, "file"), content: "x\n" });
            const f = await p.getFile(d);
            assert(f === undefined);
        });

    });

    describe("hasFile", () => {

        it("should return true for existing file", async () => {
            const p = InMemoryProject.of({ path: "package.json", content: "{ node: true }" });
            const f = await p.hasFile("package.json");
            assert(f === true);
        });

        it("should return false for non-existent file", async () => {
            const p = InMemoryProject.of({ path: "package.json", content: "{ node: true }" });
            const f = await p.hasFile("xxxxpackage.json");
            assert(f === false);
        });

        it("should return false for directory", async () => {
            const d = path.join("some", "dir");
            const p = InMemoryProject.of({ path: path.join(d, "file"), content: "x\n" });
            const f = await p.hasFile(d);
            assert(f === false);
        });

    });

    describe("hasDirectory", () => {

        it("should return true for existing directory", async () => {
            const fp = path.join("some", "dir", "file.ts");
            const p = InMemoryProject.of({ path: fp, content: "declare module;\n" });
            assert(await p.hasDirectory("some") === true);
            assert(await p.hasDirectory(path.join("some", "dir")) === true);
        });

        it("should return false for non-existent directory", async () => {
            const p = InMemoryProject.of({ path: "package.json", content: "{ node: true }" });
            assert(await p.hasDirectory("dir") === false);
        });

        it("should return false for file", async () => {
            const fp = path.join("some", "dir", "file.ts");
            const p = InMemoryProject.of({ path: fp, content: "declare module;\n" });
            assert(await p.hasDirectory(fp) === false);
        });

    });

    describe("fileExistsSync", () => {

        it("should find existing file", () => {
            const p = InMemoryProject.of({ path: "package.json", content: "{ node: true }" });
            assert(p.fileExistsSync("package.json") === true);
        });

        it("should not find non-existent file", () => {
            const p = InMemoryProject.of({ path: "package.json", content: "{ node: true }" });
            assert(p.fileExistsSync("xxxxpackage.json") === false);
        });

        it("should not find directory", () => {
            const d = path.join("some", "dir");
            const p = InMemoryProject.of({ path: path.join(d, "file"), content: "x\n" });
            assert(p.fileExistsSync(d) === false);
        });

    });

    describe("streamFiles", () => {

        it("files returns enough files", async () => {
            const p = InMemoryProject.of(
                { path: "package.json", content: "{ node: true }" },
                { path: "package-lock.json", content: "{ node: true }" },
            );
            const files = await toPromise(p.streamFiles());
            assert.strictEqual(files.length, 2);
        });

        it("streamFiles returns enough files", done => {
            let count = 0;
            const p = InMemoryProject.of(
                { path: "package.json", content: "{ node: true }" },
                { path: "package-lock.json", content: "{ node: true }" },
            );
            p.streamFiles()
                .on("data", (f: File) => {
                    // console.log(`File path is [${f.path}]`);
                    assert(f.name);
                    count++;
                },
                ).on("end", () => {
                    assert.strictEqual(count, 2);
                    done();
                });
        });

        it("streamFiles excludes glob non-matches", done => {
            let count = 0;
            const p = InMemoryProject.of(
                { path: "config/thing.js", content: "{ node: true }" },
                { path: "config/other.ts", content: "{ node: true }" },
                { path: "notconfig/other.ts", content: "{ node: true }" },
            );
            p.streamFiles("config/**")
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
            const p = InMemoryProject.of(
                { path: "config/thing.js", content: "{ node: true }" },
                { path: "config/other.ts", content: "{ node: true }" },
                { path: "notconfig/other.ts", content: "{ node: true }" },
                { path: ".git/junk", content: "whatever" },
            );
            p.streamFiles(AllFiles)
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
            const p = InMemoryProject.of(
                { path: "config/thing.js", content: "{ node: true }" },
                { path: "config/other.ts", content: "{ node: true }" },
                { path: "notconfig/other.ts", content: "{ node: true }" },
                { path: "nested/.git/junk", content: "whatever" },
                { path: "sub/project/node_modules/thing", content: "whatever" },
            );
            p.streamFiles(AllFiles)
                .on("data", (f: File) => {
                    // console.log(`File path is [${f.path}]`);
                    assert(f.name);
                    count++;
                },
                ).on("end", () => {
                    // Exclude node modules but not git as it's not at the root
                    assert.equal(count, 4);
                    done();
                });
        });

        it("streamFiles respects negative globs", done => {
            let count = 0;
            const p = InMemoryProject.of(
                { path: "config/thing.js", content: "{ node: true }" },
                { path: "config/other.ts", content: "{ node: true }" },
                { path: "config/exclude.ts", content: "{ node: true }" },
            );
            p.streamFilesRaw(["config/**", "!**/exclude.*"], {})
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
            const p = InMemoryProject.of(
                { path: "package.json", content: "{ node: true }" },
                { path: "package-lock.json", content: "{ node: true }" },
            );
            toPromise(p.streamFiles())
                .then(files => {
                    assert(files.some(f => f.name === "package.json"));
                    done();
                }).catch(done);
        });

        it("glob returns well-known file", async () => {
            const p = InMemoryProject.of(
                { path: "package.json", content: "{ node: true }" },
                { path: "package-lock.json", content: "{ node: true }" },
            );
            const files = await toPromise(p.streamFiles("package.json"));
            assert(files.some(f => f.name === "package.json"));
        });

    });

    it("file count", async () => {
        const p = InMemoryProject.of(
            { path: "package.json", content: "{ node: true }" },
            { path: "package-lock.json", content: "{ node: true }" },
        );
        const num = await p.totalFileCount();
        assert(num > 0);
    }).timeout(5000);

    describe("addFile", () => {

        it("adds file", async () => {
            const p = new InMemoryProject();
            p.recordAddFile("thing", "1");
            assert(!p.dirty);
            await p.flush();
            const f2 = p.findFileSync("thing");
            assert(f2);
        });

        it("adds nested file", async () => {
            const p = new InMemoryProject();
            p.recordAddFile("config/thing", "1");
            assert(!p.dirty);
            await p.flush();
            const f2 = p.findFileSync("config/thing");
            assert(f2);
        });

        it("adds deeply nested file", async () => {
            const p = new InMemoryProject();
            p.recordAddFile("config/and/more/thing", "1");
            assert(!p.dirty);
            await p.flush();
            const f2 = p.findFileSync("config/and/more/thing");
            assert(f2);
        });

    });

    describe("delete", () => {

        it("deletes file", async () => {
            const p = new InMemoryProject();
            p.addFileSync("thing", "1");
            const f1 = p.findFileSync("thing");
            assert.strictEqual(f1.getContentSync(), "1");
            assert(!p.dirty);
            p.recordDeleteFile("thing");
            assert(p.dirty);
            await p.flush();
            const f2 = p.findFileSync("thing");
            assert(!f2);
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

        it("should async delete a file", async () => {
            const p = InMemoryProject.of(...deleteTestFiles);
            const paths = deleteTestFiles.map(f => f.path);
            const remove = ["CODE_OF_CONDUCT.md"];
            const remain = paths.filter(f => !remove.includes(f));
            await Promise.all(remove.map(f => p.deleteFile(f)));
            remain.forEach(f => assert(p.fileExistsSync(f)));
            remove.forEach(f => assert(!p.fileExistsSync(f)));
            deleteTestDirs.forEach(d => assert(p.directoryExistsSync(d)));
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

        it("should async delete files", async () => {
            const p = InMemoryProject.of(...deleteTestFiles);
            const paths = deleteTestFiles.map(f => f.path);
            const remove = ["CODE_OF_CONDUCT.md", ".travis/some.patch"];
            const remain = paths.filter(f => !remove.includes(f));
            await Promise.all(remove.map(f => p.deleteFile(f)));
            remain.forEach(f => assert(p.fileExistsSync(f)));
            remove.forEach(f => assert(!p.fileExistsSync(f)));
            deleteTestDirs.forEach(d => assert(p.directoryExistsSync(d)));
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

        it("should async delete a file and empty directories", async () => {
            const p = InMemoryProject.of(...deleteTestFiles);
            const paths = deleteTestFiles.map(f => f.path);
            const remove = ["CODE_OF_CONDUCT.md", "src/main/java/Command.java"];
            const remain = paths.filter(f => !remove.includes(f));
            const removeDirs = ["src/main", "src/main/java"];
            const remainDirs = deleteTestDirs.filter(d => !removeDirs.includes(d));
            await Promise.all(remove.map(f => p.deleteFile(f)));
            remain.forEach(f => assert(p.fileExistsSync(f)));
            remove.forEach(f => assert(!p.fileExistsSync(f)));
            remainDirs.forEach(d => assert(p.directoryExistsSync(d)));
            removeDirs.forEach(d => assert(!p.directoryExistsSync(d)));
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

        it("should async delete a file and empty directories", async () => {
            const p = InMemoryProject.of(...deleteTestFiles);
            const paths = deleteTestFiles.map(f => f.path);
            const removeDirs = [".travis"];
            const remainDirs = deleteTestDirs.filter(d => !removeDirs.includes(d));
            const remove = [".travis/travis-build.bash", ".travis/some.patch"];
            const remain = paths.filter(f => !remove.includes(f));
            await Promise.all(removeDirs.map(d => p.deleteDirectory(d)));
            remain.forEach(f => assert(p.fileExistsSync(f)));
            remove.forEach(f => assert(!p.fileExistsSync(f)));
            remainDirs.forEach(d => assert(p.directoryExistsSync(d)));
            removeDirs.forEach(d => assert(!p.directoryExistsSync(d)));
        });

    });

});
