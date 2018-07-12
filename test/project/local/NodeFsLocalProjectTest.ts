import "mocha";

import * as appRoot from "app-root-path";
import * as assert from "power-assert";
import * as tmp from "tmp-promise";

import { LocalProject } from "../../../src/project/local/LocalProject";

import { File } from "../../../src/project/File";

import * as fs from "fs";
import { defer, ScriptedFlushable } from "../../../src/internal/common/Flushable";
import { GitHubRepoRef } from "../../../src/operations/common/GitHubRepoRef";
import { AllFiles, ExcludeNodeModules } from "../../../src/project/fileGlobs";
import { NodeFsLocalProject } from "../../../src/project/local/NodeFsLocalProject";
import { InMemoryProject } from "../../../src/project/mem/InMemoryProject";
import { Project } from "../../../src/project/Project";
import { toPromise } from "../../../src/project/util/projectUtils";
import { tempProject } from "../utils";

describe("NodeFsLocalProject", () => {

    const thisProject: LocalProject = new NodeFsLocalProject(
        new GitHubRepoRef("owner", "test"), appRoot.path);

    it("can create from string", () => {
        const p = new NodeFsLocalProject("thing", "/base/dir", () => Promise.resolve());
        assert(p.id.owner === undefined);
        assert(p.id.repo === "thing");
    });

    it("rejects no such directory", done => {
        NodeFsLocalProject.fromExistingDirectory(new GitHubRepoRef("owner", "name"),
            "This/is/complete/nonsense")
            .then(() => {
                return Promise.reject("Should have failed due to invalid directory");
            }, err => {
                return;
            })
            .then(() => done(), done);
    });

    it("copies in memory project", done => {
        const proj = InMemoryProject.from(
            new GitHubRepoRef("owner", "name"),
            { path: "package.json", content: "{ node }" },
            { path: "some/nested/thing", content: "{ node }" },
        );
        const tmpDir = tmp.dirSync({ unsafeCleanup: true });
        const baseDir: string = tmpDir.name;
        NodeFsLocalProject.copy(proj, baseDir).then(p => {
            assert(p.baseDir === baseDir);
            const f = p.findFileSync("package.json");
            assert(f.getContentSync());
            assert(f.getContentSync().includes("node"));
            assert(p.findFileSync("some/nested/thing"));
        })
            .then(() => tmpDir.removeCallback())
            .then(() => done(), done);
    });

    it("copies in memory project including empty directory", done => {
        const proj = InMemoryProject.from(
            new GitHubRepoRef("owner", "name"),
            { path: "package.json", content: "{ node }" },
            { path: "some/nested/thing", content: "{ node }" },
        );
        proj.addDirectory("emptyDir")
            .then(() => {
                const tmpDir = tmp.dirSync({ unsafeCleanup: true });
                const baseDir: string = tmpDir.name;
                return NodeFsLocalProject.copy(proj, baseDir).then(p => {
                    assert(fs.statSync(p.baseDir + "/emptyDir").isDirectory());
                })
                    .then(() => tmpDir.removeCallback());
            })
            .then(() => done(), done);
    });

    it.skip("copies in memory project including empty directory and copies back", done => {
        const proj = InMemoryProject.from(
            new GitHubRepoRef("owner", "name"),
            { path: "package.json", content: "{ node }" },
            { path: "some/nested/thing", content: "{ node }" },
        );
        proj.addDirectory("emptyDir")
            .then(() => {
                const tmpDir = tmp.dirSync({ unsafeCleanup: true });
                const baseDir: string = tmpDir.name;
                return NodeFsLocalProject.copy(proj, baseDir).then(p => {
                    assert(fs.statSync(p.baseDir + "/emptyDir").isDirectory());
                    const inmp = InMemoryProject.cache(proj);
                    inmp.then(inm => {
                        assert(!!inm.findFileSync("package.json"));
                        assert(!!inm.findFileSync("some/nested/thing"));
                        assert(inm.addedDirectoryPaths.includes("emptyDir"));
                    });
                })
                    .then(() => tmpDir.removeCallback());
            })
            .then(() => done(), done);
    });

    it("copies other local project", done => {
        const proj = tempProject(new GitHubRepoRef("owner", "name"));
        proj.addFileSync("package.json", "{ node }");
        proj.addFileSync("some/nested/thing", "{ node }");

        const tmpDir = tmp.dirSync({ unsafeCleanup: true });
        const baseDir: string = tmpDir.name;
        NodeFsLocalProject.copy(proj, baseDir)
            .then(p => {
                assert(p.baseDir === baseDir, p.baseDir);
                const f = p.findFileSync("package.json");
                assert(f.getContentSync());
                assert(f.getContentSync().includes("node"));
                assert(p.findFileSync("some/nested/thing"));
            })
            .then(() => tmpDir.removeCallback())
            .then(() => done(), done);
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

    it("findFile: no such file", done => {
        thisProject.findFile("xxxxpackage.json")
            .then(() => assert(false, "found nonexistent file"), err => assert(true, "no file"))
            .then(() => done(), done);
    });

    it("getFile: no such file", done => {
        thisProject.getFile("xxxxpackage.json")
            .then(f => {
                console.log("File is " + f);
                assert(f === undefined);
            })
            .then(() => done(), done);
    });

    it("findFile: existing file", done => {
        thisProject.findFile("package.json")
            .then(f => {
                assert(f.path === "package.json");
            })
            .then(() => done(), done);
    });

    it("getFile: existing file", done => {
        thisProject.getFile("package.json")
            .then(f => assert(!!f))
            .then(() => done(), done);
    });

    it("fileExistsSync: existing file", () => {
        assert(thisProject.fileExistsSync("package.json"));
    });

    it("fileExistsSync: no such file", () => {
        assert(!thisProject.fileExistsSync("xxxxpackage.json"));
    });

    it("files returns enough files", done => {
        toPromise(thisProject.streamFiles(AllFiles, ExcludeNodeModules))
            .then(files => {
                assert(files.length > 50);
            })
            .then(() => done(), done);
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
            { path: "config/thing.js", content: "{ node: true }" },
            { path: "config/other.ts", content: "{ node: true }" },
            { path: "notconfig/other.ts", content: "{ node: true }" },
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
        }).on("error", done);
    });

    it("glob returns well-known file", done => {
        toPromise(thisProject.streamFiles("package.json"))
            .then(files => {
                assert(files.some(f => f.name === "package.json"));
            })
            .then(() => done(), done);
    });

    it("file count", done => {
        thisProject.totalFileCount().then(num => {
            assert(num > 0);
        })
            .then(() => done(), done);
    });

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
            })
            .then(() => done(), done);
    });

    it("adds file", done => {
        const p = tempProject() as any as Project & ScriptedFlushable<any>;
        defer(p, p.addFile("thing", "1"));
        assert(p.dirty);
        p.flush()
            .then(_ => {
                const f2 = p.findFileSync("thing");
                assert(f2);
            })
            .then(() => done(), done);
    });

    it("moves file that's there", done => {
        const p = tempProject() as any as Project & ScriptedFlushable<any>;
        defer(p, p.addFile("thing", "1"));
        assert(p.dirty);
        p.flush()
            .then(flushed => {
                const f2 = p.findFileSync("thing");
                assert(f2);
                return p.moveFile(f2.path, "thing2").then(_ => {
                    assert(_.findFileSync("thing2").getContentSync() === "1");
                });
            })
            .then(() => done(), done);
    });

    it("attempts to move file that's not there without error", done => {
        const p = tempProject() as any as Project & ScriptedFlushable<any>;
        defer(p, p.addFile("thing", "1"));
        assert(p.dirty);
        p.flush()
            .then(flushed => {
                const f2 = p.findFileSync("thing");
                assert(f2);
                return p.moveFile("this/aint/there", "thing2").then(_ => {
                    assert(_.findFileSync("thing").getContentSync() === "1");
                });
            })
            .then(() => done(), done);
    });

    it("adds nested file", done => {
        const p = tempProject() as any as Project & ScriptedFlushable<any>;
        defer(p, p.addFile("config/thing", "1"));
        assert(p.dirty);
        p.flush()
            .then(_ => {
                const f2 = p.findFileSync("config/thing");
                assert(f2);
            })
            .then(() => done(), done);
    });

    it("adds deeply nested file", done => {
        const p = tempProject() as any as Project & ScriptedFlushable<any>;
        defer(p, p.addFile("config/and/more/thing", "1"));
        assert(p.dirty);
        p.flush()
            .then(_ => {
                const f2 = p.findFileSync("config/and/more/thing");
                assert(f2);
            })
            .then(() => done(), done);
    });

    it("deletes file", done => {
        const p = tempProject() as any as Project & ScriptedFlushable<any>;
        p.addFileSync("thing", "1");
        const f1 = p.findFileSync("thing");
        assert(f1.getContentSync() === "1");
        assert(!p.dirty);
        defer(p, p.deleteFile("thing"));
        assert(p.dirty);
        p.flush()
            .then(_ => {
                const f2 = p.findFileSync("thing");
                assert(!f2);
            })
            .then(() => done(), done);
    });

    it("deletes non-empty directory", done => {
        const p = tempProject();
        p.addFileSync("dir/thing", "1");
        assert(p.findFileSync("dir/thing"));
        p.deleteDirectory("dir")
            .then(_ => {
                const f2 = p.findFileSync("dir/thing");
                assert(!f2);
            })
            .then(() => done(), done);
    });

    it("deletes directory with subdirectories", done => {
        const p = tempProject();
        p.addFileSync("dir/thing", "1");
        p.addFileSync("dir/this/that", "2");
        assert(p.findFileSync("dir/this/that"));
        p.deleteDirectory("dir")
            .then(_ => {
                const f2 = p.findFileSync("dir/thing");
                assert(!f2);
                const f3 = p.findFileSync("dir/this/that");
                assert(!f3);
            })
            .then(() => done(), done);
    });

});
