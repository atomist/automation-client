import * as appRoot from "app-root-path";

import * as fs from "fs-extra";
import * as path from "path";
import * as assert from "power-assert";
import * as tmp from "tmp-promise";
import { GitHubRepoRef } from "../../../lib/operations/common/GitHubRepoRef";

import { File } from "../../../lib/project/File";
import {
    AllFiles,
    ExcludeNodeModules,
} from "../../../lib/project/fileGlobs";

import { LocalProject } from "../../../lib/project/local/LocalProject";
import { NodeFsLocalProject } from "../../../lib/project/local/NodeFsLocalProject";
import { InMemoryProject } from "../../../lib/project/mem/InMemoryProject";
import { toPromise } from "../../../lib/project/util/projectUtils";
import { tempProject } from "../utils";

/* tslint:disable:max-file-line-count */

describe("NodeFsLocalProject", () => {

    const thisProject: LocalProject = new NodeFsLocalProject(
        new GitHubRepoRef("owner", "test"), appRoot.path);
    const existingFile = "package.json";
    const nonExistentFile = "xxxxpackage.json";
    const existingDirectory = "test";

    it("can create from string", () => {
        const p = new NodeFsLocalProject("thing", path.join("/base", "dir"), () => Promise.resolve());
        assert(p.id.owner === undefined);
        assert(p.id.repo === "thing");
    });

    it("rejects no such directory", done => {
        NodeFsLocalProject.fromExistingDirectory(new GitHubRepoRef("owner", "name"),
            path.join("This", "is", "complete", "nonsense"))
            .then(() => {
                return Promise.reject("Should have failed due to invalid directory");
            }, err => {
                return;
            })
            .then(done, done);
    });

    it("copies in memory project", done => {
        const proj = InMemoryProject.from(
            new GitHubRepoRef("owner", "name"),
            { path: "package.json", content: "{ node }" },
            { path: path.join("some", "nested", "thing"), content: "{ node }" },
        );
        const tmpDir = tmp.dirSync({ unsafeCleanup: true });
        const baseDir: string = tmpDir.name;
        NodeFsLocalProject.copy(proj, baseDir).then(p => {
            assert(p.baseDir === baseDir);
            const f = p.findFileSync("package.json");
            assert(f.getContentSync());
            assert(f.getContentSync().includes("node"));
            assert(p.findFileSync(path.join("some", "nested", "thing")));
        })
            .then(() => tmpDir.removeCallback())
            .then(done, done);
    });

    it("copies in memory project including empty directory", done => {
        const proj = InMemoryProject.from(
            new GitHubRepoRef("owner", "name"),
            { path: "package.json", content: "{ node }" },
            { path: path.join("some", "nested", "thing"), content: "{ node }" },
        );
        proj.addDirectory("emptyDir")
            .then(() => {
                const tmpDir = tmp.dirSync({ unsafeCleanup: true });
                const baseDir: string = tmpDir.name;
                return NodeFsLocalProject.copy(proj, baseDir).then(p => {
                    assert(fs.statSync(path.join(p.baseDir, "emptyDir")).isDirectory());
                })
                    .then(() => tmpDir.removeCallback());
            })
            .then(done, done);
    });

    it.skip("copies in memory project including empty directory and copies back", done => {
        const proj = InMemoryProject.from(
            new GitHubRepoRef("owner", "name"),
            { path: "package.json", content: "{ node }" },
            { path: path.join("some", "nested", "thing"), content: "{ node }" },
        );
        proj.addDirectory("emptyDir")
            .then(() => {
                const tmpDir = tmp.dirSync({ unsafeCleanup: true });
                const baseDir: string = tmpDir.name;
                return NodeFsLocalProject.copy(proj, baseDir).then(p => {
                    assert(fs.statSync(path.join(p.baseDir, "emptyDir")).isDirectory());
                    const inmp = InMemoryProject.cache(proj);
                    return inmp.then(inm => {
                        assert(!!inm.findFileSync("package.json"));
                        assert(!!inm.findFileSync(path.join("some", "nested", "thing")));
                        assert(inm.addedDirectoryPaths.includes("emptyDir"));
                    });
                })
                    .then(() => tmpDir.removeCallback());
            })
            .then(done, done);
    });

    it("copies other local project", done => {
        const proj = tempProject(new GitHubRepoRef("owner", "name"));
        proj.addFileSync("package.json", "{ node }");
        proj.addFileSync(path.join("some", "nested", "thing"), "{ node }");

        const tmpDir = tmp.dirSync({ unsafeCleanup: true });
        const baseDir: string = tmpDir.name;
        NodeFsLocalProject.copy(proj, baseDir)
            .then(p => {
                assert(p.baseDir === baseDir, p.baseDir);
                const f = p.findFileSync("package.json");
                assert(f.getContentSync());
                assert(f.getContentSync().includes("node"));
                assert(p.findFileSync(path.join("some", "nested", "thing")));
            })
            .then(() => tmpDir.removeCallback())
            .then(done, done);
    });

    describe("findFile", () => {

        it("findFileSync: existing file", () => {
            const f = thisProject.findFileSync(existingFile);
            const c = f.getContentSync();
            assert(c);
            assert(c.indexOf(`"name"`) > -1);
        });

        it("findFileSync: no such file", () => {
            const f = thisProject.findFileSync(nonExistentFile);
            assert(f === undefined);
        });

        it("findFileSync: directory should return undefined", () => {
            const f = thisProject.findFileSync(existingDirectory);
            assert(f === undefined);
        });

        it("findFile: no such file", done => {
            thisProject.findFile(nonExistentFile)
                .then(() => assert.fail("found nonexistent file"), err => assert(err.code === "ENOENT"))
                .then(done, done);
        });

        it("findFile: existing file", async () => {
            const f = await thisProject.findFile(existingFile);
            assert(f.path === existingFile);
            const c = await f.getContent();
            assert(c.indexOf(`"name"`) > -1);
        });

        it("findFile: reject a directory", done => {
            thisProject.findFile(existingDirectory)
                .then(() => assert.fail("returned directory as a file"),
                    err => assert(err.message === `Path ${existingDirectory} is not a regular file`))
                .then(done, done);
        });

    });

    describe("fileExistsSync", () => {

        it("should return true for existing file", () => {
            assert(thisProject.fileExistsSync(existingFile) === true);
        });

        it("should return false for no such file", () => {
            assert(thisProject.fileExistsSync(nonExistentFile) === false);
        });

        it("should return false for directory", () => {
            assert(thisProject.fileExistsSync(existingDirectory) === false);
        });

    });

    describe("getFile", () => {

        it("should return undefined for non-existent file", async () => {
            const f = await thisProject.getFile(nonExistentFile);
            assert(f === undefined);
        });

        it("should return file object for existing file", async () => {
            const f = await thisProject.getFile(existingFile);
            assert(!!f);
            const c = await f.getContent();
            assert(c.includes(`"name"`));
        });

        it("should return undefined for directory", async () => {
            const f = await thisProject.getFile(existingDirectory);
            assert(f === undefined);
        });

    });

    describe("streamFiles", () => {

        it("files returns enough files", done => {
            toPromise(thisProject.streamFiles(AllFiles, ExcludeNodeModules))
                .then(files => {
                    assert(files.length > 50);
                })
                .then(done, done);
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
                })
                .on("error", done);
        });

        it("streamFiles excludes glob non-matches", done => {
            let count = 0;
            const files = [
                { path: path.join("config", "thing.js"), content: "{ node: true }" },
                { path: path.join("config", "other.ts"), content: "{ node: true }" },
                { path: path.join("notconfig", "other.ts"), content: "{ node: true }" },
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
                    fs.removeSync(p.baseDir);
                    done();
                }).on("error", done);
        });

        it("glob returns well-known file", done => {
            toPromise(thisProject.streamFiles(existingFile))
                .then(files => {
                    assert(files.some(f => f.name === existingFile));
                })
                .then(done, done);
        });

    });

    it("file count", done => {
        thisProject.totalFileCount().then(num => {
            assert(num > 0);
        })
            .then(done, done);
    });

    describe("addFile", () => {

        it("should add a file", async () => {
            const p = tempProject();
            const pp = "thing";
            await p.addFile(pp, "1");
            const pf = await p.findFile(pp);
            assert(pf);
            const pc = await pf.getContent();
            assert(pc === "1");
            const rp = path.join(p.baseDir, pp);
            assert(fs.existsSync(rp) === true);
            const rc = await fs.readFile(rp, { encoding: "utf8" });
            assert(rc === "1");
            await p.release();
        });

        it("should add files with various paths", async () => {
            const p = tempProject();
            const filePaths = [
                "thing",
                path.join("config", "prod.json"),
                path.join("some", "deeply", "nested", "path", "to", "stuff"),
            ];
            const c = "the content\nof the\nfile\n";
            for (const pp of filePaths) {
                await p.addFile(pp, c);
                const pf = await p.findFile(pp);
                assert(pf);
                const pc = await pf.getContent();
                assert(pc === c);
                const rp = path.join(p.baseDir, pp);
                assert(fs.existsSync(rp) === true);
                const rc = await fs.readFile(rp, { encoding: "utf8" });
                assert(rc === c);
            }
            await p.release();
        });

    });

    describe("moveFile", () => {

        it("moves file that's there", async () => {
            const p = tempProject();
            const pp = "thing";
            await p.addFile(pp, "1");
            const pf = await p.findFile(pp);
            assert(pf);
            const pc = await pf.getContent();
            assert(pc === "1");
            const rp = path.join(p.baseDir, pp);
            assert(fs.existsSync(rp) === true);
            const pp2 = "thing2";
            await p.moveFile(pf.path, pp2);
            const pf2 = await p.findFile(pp2);
            const pc2 = await pf2.getContent();
            assert(pc2 === "1");
            const rp2 = path.join(p.baseDir, pp2);
            assert(fs.existsSync(rp2) === true);
            const rc2 = await fs.readFile(rp2, { encoding: "utf8" });
            assert(rc2 === "1");
            await p.release();
        });

        it("attempts to move file that's not there without error", async () => {
            const p = tempProject();
            const pp = "thing";
            await p.addFile(pp, "1");
            const pp2 = "thing2";
            await p.moveFile(path.join("this", "aint", "there"), pp2);
            const pf = await p.findFile(pp);
            assert(pf);
            const pc = await pf.getContent();
            assert(pc === "1");
            const rp = path.join(p.baseDir, pp);
            assert(fs.existsSync(rp) === true);
            const rc = await fs.readFile(rp, { encoding: "utf8" });
            assert(rc === "1");
            assert(await p.hasFile(pp2) === false);
            await p.release();
        });

    });

    describe("delete", () => {

        it("deletes file", async () => {
            const p = tempProject();
            p.addFileSync("thing", "1");
            const f1 = p.findFileSync("thing");
            assert(f1.getContentSync() === "1");
            await p.deleteFile("thing");
            const f2 = p.findFileSync("thing");
            assert(!f2);
            await p.release();
        });

        it("deletes non-empty directory", async () => {
            const p = tempProject();
            const pf = path.join("dir", "thing");
            p.addFileSync(pf, "1");
            assert(p.findFileSync(pf));
            await p.deleteDirectory("dir");
            const f2 = p.findFileSync(pf);
            assert(!f2);
            await p.release();
        });

        it("deletes directory with subdirectories", async () => {
            const p = tempProject();
            const filePaths = [
                path.join("dir", "thing"),
                path.join("dir", "this", "that"),
                path.join("some", "other", "dir", "stuff"),
            ];
            for (let i = 0; i < filePaths.length; i++) {
                await p.addFile(filePaths[i], `${i}\n`);
            }
            // tslint:disable-next-line:prefer-for-of
            for (let i = 0; i < filePaths.length; i++) {
                const rp = path.join(p.baseDir, filePaths[i]);
                assert(await p.hasFile(filePaths[i]) === true);
                assert(fs.existsSync(rp) === true);
            }
            await p.deleteDirectory("dir");
            // delete files under dir
            for (let i = 0; i < 2; i++) {
                const rp = path.join(p.baseDir, filePaths[i]);
                assert(await p.hasFile(filePaths[i]) === false);
                assert(fs.existsSync(rp) === false);
            }
            // but leave the rest
            assert(await p.hasFile(filePaths[2]) === true);
            assert(fs.existsSync(path.join(p.baseDir, filePaths[2])) === true);
            await p.release();
        });

        it("deletes a non-existant directory without error", async () => {
            const p = tempProject();
            const pp1 = path.join("dir", "thing");
            const pp2 = path.join("dir", "this", "that");
            await p.addFile(pp1, "1");
            await p.addFile(pp2, "2");
            const rp1 = path.join(p.baseDir, pp1);
            const rp2 = path.join(p.baseDir, pp2);
            assert(await p.hasFile(pp1) === true);
            assert(await p.hasFile(pp2) === true);
            assert(fs.existsSync(rp1) === true);
            assert(fs.existsSync(rp2) === true);
            await p.deleteDirectory("nodir");
            assert(await p.hasFile(pp1) === true);
            assert(await p.hasFile(pp2) === true);
            assert(fs.existsSync(rp1) === true);
            assert(fs.existsSync(rp2) === true);
            await p.release();
        });

    });

    describe("makeExecutable", () => {

        /* tslint:disable:no-bitwise */

        it("should make a file executable", async () => {
            const p = tempProject();
            const f = path.join("dir", "thing");
            await p.addFile(f, "1");
            await p.makeExecutable(f);
            const s = await fs.stat(path.join(p.baseDir, f));
            assert(s.mode & fs.constants.S_IXUSR);
            assert(s.mode & fs.constants.S_IXGRP);
            assert(s.mode & fs.constants.S_IXOTH);
            await p.release();
        });

        it("should only make the requested file executable", async () => {
            const p = tempProject();
            const f = path.join("dir", "thing");
            await p.addFile(f, "1");
            const f2 = path.join("other", "thing");
            await p.addFile(f2, "2");
            await p.makeExecutable(f);
            const s = await fs.stat(path.join(p.baseDir, f));
            assert(s.mode & fs.constants.S_IXUSR);
            assert(s.mode & fs.constants.S_IXGRP);
            assert(s.mode & fs.constants.S_IXOTH);
            const s2 = await fs.stat(path.join(p.baseDir, f2));
            assert((s2.mode & fs.constants.S_IXUSR) === 0);
            assert((s2.mode & fs.constants.S_IXGRP) === 0);
            assert((s2.mode & fs.constants.S_IXOTH) === 0);
            await p.release();
        });

        it("should leave a file executable", async () => {
            const tmpDir = tmp.dirSync({ unsafeCleanup: true });
            const f = path.join("dir", "thing");
            await fs.outputFile(path.join(tmpDir.name, f), "1\n", { mode: 0o777 });
            const p = await NodeFsLocalProject.fromExistingDirectory(new GitHubRepoRef("owner", "name"), tmpDir.name,
                async () => tmpDir.removeCallback());
            await p.makeExecutable(f);
            const s = await fs.stat(path.join(p.baseDir, f));
            assert(s.mode & fs.constants.S_IXUSR);
            assert(s.mode & fs.constants.S_IXGRP);
            assert(s.mode & fs.constants.S_IXOTH);
            await p.release();
        });

        it("should make a file executable sync", async () => {
            const p = tempProject();
            const f = path.join("dir", "thing");
            p.addFileSync(f, "1");
            p.makeExecutableSync(f);
            const s = await fs.stat(path.join(p.baseDir, f));
            assert(s.mode & fs.constants.S_IXUSR);
            assert(s.mode & fs.constants.S_IXGRP);
            assert(s.mode & fs.constants.S_IXOTH);
            await p.release();
        });

        it("should only make the requested file executable sync", async () => {
            const p = tempProject();
            const f = path.join("dir", "thing");
            await p.addFile(f, "1");
            const f2 = path.join("other", "thing");
            await p.addFile(f2, "2");
            p.makeExecutableSync(f);
            const s = await fs.stat(path.join(p.baseDir, f));
            assert(s.mode & fs.constants.S_IXUSR);
            assert(s.mode & fs.constants.S_IXGRP);
            assert(s.mode & fs.constants.S_IXOTH);
            const s2 = await fs.stat(path.join(p.baseDir, f2));
            assert((s2.mode & fs.constants.S_IXUSR) === 0);
            assert((s2.mode & fs.constants.S_IXGRP) === 0);
            assert((s2.mode & fs.constants.S_IXOTH) === 0);
            await p.release();
        });

        it("should leave a file executable sync", async () => {
            const tmpDir = tmp.dirSync({ unsafeCleanup: true });
            const f = path.join("dir", "thing");
            await fs.outputFile(path.join(tmpDir.name, f), "1\n", { mode: 0o777 });
            const p = await NodeFsLocalProject.fromExistingDirectory(new GitHubRepoRef("owner", "name"), tmpDir.name,
                async () => tmpDir.removeCallback());
            p.makeExecutableSync(f);
            const s = await fs.stat(path.join(p.baseDir, f));
            assert(s.mode & fs.constants.S_IXUSR);
            assert(s.mode & fs.constants.S_IXGRP);
            assert(s.mode & fs.constants.S_IXOTH);
            await p.release();
        });

        /* tslint:enable:no-bitwise */

    });

    describe("directoryExistsSync", () => {

        it("should verify the directory exists", async () => {
            const tmpDir = tmp.dirSync({ unsafeCleanup: true });
            const dirs = ["dir", "nested", "deeply", "into", "project"];
            const d = path.join(...dirs);
            const f = path.join(d, "thing");
            await fs.outputFile(path.join(tmpDir.name, f), "1\n");
            const p = await NodeFsLocalProject.fromExistingDirectory(new GitHubRepoRef("owner", "name"), tmpDir.name,
                async () => tmpDir.removeCallback());
            for (let i = 0; i < dirs.length; i++) {
                assert(p.directoryExistsSync(path.join(...dirs.slice(0, i + 1))));
            }
            await p.release();
        });

        it("should return false if directory does not exist", async () => {
            const tmpDir = tmp.dirSync({ unsafeCleanup: true });
            const f = path.join(tmpDir.name, "dir", "nested", "deeply", "into", "project", "thing");
            await fs.outputFile(f, "1\n");
            const p = await NodeFsLocalProject.fromExistingDirectory(new GitHubRepoRef("owner", "name"), tmpDir.name,
                async () => tmpDir.removeCallback());
            [path.join("does", "not", "exist"), path.join("nor", "this"), "nope"].forEach(d => {
                assert(!p.directoryExistsSync(d));
            });
            await p.release();
        });

    });

    describe("hasDirectory", () => {

        it("should return true for existing directory", async () => {
            const p = tempProject();
            const filePaths = [
                path.join("dir", "thing"),
                path.join("dir", "this", "that"),
                path.join("some", "other", "dir", "stuff"),
            ];
            await Promise.all(filePaths.map(f => p.addFile(f, "junk\n")));
            const dirs = ["dir", path.join("dir", "this"),
                "some", path.join("some", "other"), path.join("some", "other", "dir")];
            for (const d of dirs) {
                assert(await p.hasDirectory(d) === true);
            }
            await p.release();
        });

        it("should return false if directory does not exist", async () => {
            const p = tempProject();
            const filePaths = [
                path.join("dir", "thing"),
                path.join("dir", "this", "that"),
                path.join("some", "other", "dir", "stuff"),
            ];
            await Promise.all(filePaths.map(f => p.addFile(f, "junk\n")));
            const dirs = ["no", path.join("no", "thing"), path.join("no", "this"),
                path.join("some", "nother"), path.join("some", "nother", "dir")];
            for (const d of dirs) {
                assert(await p.hasDirectory(d) === false);
            }
            await p.release();
        });

        it("should return false for files", async () => {
            const p = tempProject();
            const filePaths = [
                path.join("dir", "thing"),
                path.join("dir", "this", "that"),
                path.join("some", "other", "dir", "stuff"),
            ];
            await Promise.all(filePaths.map(f => p.addFile(f, "junk\n")));
            for (const f of filePaths) {
                assert(await p.hasFile(f) === true);
                assert(await p.hasDirectory(f) === false);
            }
            await p.release();
        });

    });

});
