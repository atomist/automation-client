import * as assert from "power-assert";

import { defer } from "../../../lib/internal/common/Flushable";
import { AllFiles } from "../../../lib/project/fileGlobs";
import { InMemoryProject } from "../../../lib/project/mem/InMemoryProject";
import {
    countFiles,
    deleteFiles,
    doWithFiles,
    fileExists,
    fileIterator,
    gatherFromFiles,
} from "../../../lib/project/util/projectUtils";
import { tempProject } from "../utils";

describe("projectUtils", () => {

    it("exists: not found", done => {
        const t = tempProject();
        t.addFileSync("Thing", "1");
        fileExists(t, AllFiles, f => f.name === "nonsense")
            .then(yes => {
                assert(!yes);
            })
            .then(done, done);
    });

    it("exists: not found with promise", done => {
        const t = tempProject();
        t.addFileSync("Thing", "1");
        fileExists(t, AllFiles, async f => f.name === "nonsense")
            .then(yes => {
                assert(!yes);
            })
            .then(done, done);
    });

    it("exists: found", async () => {
        const t = tempProject();
        t.addFileSync("Thing", "1");
        const yes = await fileExists(t, AllFiles, f => f.name === "Thing");
        assert(yes);
    });

    it("exists: found with promise", done => {
        const t = tempProject();
        t.addFileSync("Thing", "1");
        fileExists(t, AllFiles, async f => f.name === "Thing")
            .then(yes => {
                assert(yes);
            })
            .then(done, done);
    });

    it("exists: found with default", done => {
        const t = tempProject();
        t.addFileSync("Thing", "1");
        fileExists(t, AllFiles)
            .then(yes => {
                assert(yes);
            })
            .then(done, done);
    });

    it("count: 0", async () => {
        const t = tempProject();
        t.addFileSync("Thing", "1");
        const count = await countFiles(t, AllFiles, f => f.name === "nonsense");
        assert.strictEqual(count, 0);
    });

    it("count: 1", async () => {
        const t = tempProject();
        t.addFileSync("Thing", "1");
        const count = await countFiles(t, AllFiles, async f => f.name === "Thing");
        assert.strictEqual(count, 1);
    });

    it("gatherFromFiles", async () => {
        const t = tempProject();
        t.addFileSync("Thing", "1");
        const gathered = await gatherFromFiles<string>(t, AllFiles, async f => {
            return f.path;
        });
        assert.strictEqual(gathered.length, 1);
        assert.strictEqual(gathered[0], "Thing");
    });

    it("fileIterator: take all", async () => {
        const t = tempProject();
        t.addFileSync("Thing", "1");
        const it = fileIterator(t, AllFiles, async () => true);
        const gathered = [];
        for await (const what of it) {
            gathered.push(what);
        }
        assert.strictEqual(gathered.length, 1);
        assert.strictEqual(gathered[0].path, "Thing");
    });

    it("fileIterator: take none due to glob", async () => {
        const t = tempProject();
        t.addFileSync("Thing", "1");
        const it = fileIterator(t, "notThere", async () => true);
        const gathered = [];
        for await (const what of it) {
            gathered.push(what);
        }
        assert.strictEqual(gathered.length, 0);
    });

    it("fileIterator: take none due to filter", async () => {
        const t = tempProject();
        t.addFileSync("Thing", "1");
        const it = fileIterator(t, AllFiles, async () => false);
        const gathered = [];
        for await (const what of it) {
            gathered.push(what);
        }
        assert.strictEqual(gathered.length, 0);
    });

    it("withFiles: run", done => {
        const t = tempProject();
        t.addFileSync("Thing", "1");
        doWithFiles(t, AllFiles, async f => {
            await f.setContent(f.getContentSync() + "2");
        })
            .then(p => {
                const f = t.findFileSync("Thing");
                assert(f.getContentSync() === "12");
            })
            .then(done, done);
    });

    it("withFiles: run with promise", done => {
        const t = tempProject();
        t.addFileSync("Thing", "1");
        doWithFiles(t, AllFiles, f => {
            return f.setContent(f.getContentSync() + "2");
        })
            .then(p => {
                assert(!!p);
                const f = t.findFileSync("Thing");
                assert(f.getContentSync() === "12");
            })
            .then(done, done);
    });

    it("withFiles: defer with promise", done => {
        const t = tempProject();
        t.addFileSync("Thing", "1");
        defer(t, doWithFiles(t, AllFiles, f => {
            return f.setContent(f.getContentSync() + "2");
        }));
        assert(t.dirty);
        t.flush()
            .then(files => {
                assert(!t.dirty);
                const f = t.findFileSync("Thing");
                assert(f.getContentSync() === "12");
            })
            .then(done, done);
    });

    it("deleteFiles deletes none", done => {
        const t = tempProject();
        t.addFileSync("Thing", "1");
        deleteFiles(t, AllFiles, f => false)
            .then(count => {
                assert(count === 0);
            })
            .then(done, done);
    });

    it("deleteFiles: run deletes 2", done => {
        const t = tempProject();
        t.addFileSync("Thing", "1");
        t.addFileSync("config/Thing", "1");
        deleteFiles(t, "**/Thing", f => true)
            .then(count => {
                assert(count === 2, `Only deleted ${count}`);
            })
            .then(done, done);
    });

    it("deleteFiles: defer deletes 2", done => {
        const t = new InMemoryProject();
        t.addFileSync("Thing", "1");
        t.addFileSync("config/Thing", "1");
        defer(t, deleteFiles(t, "**/Thing", f => true));
        assert(t.fileCount === 2);
        t.flush()
            .then(count => {
                assert(t.fileCount === 0);
            })
            .then(done, done);
    });

    it("deleteFiles: run deletes conditionally", done => {
        const t = tempProject();
        t.addFileSync("Thing", "1");
        t.addFileSync("config/Thing", "1");
        deleteFiles(t, "**/Thing", f => f.path.includes("config"))
            .then(count => {
                assert(count === 1, `Only deleted ${count}`);
            })
            .then(done, done);
    });

    it("deleteFiles: defer deletes conditionally", done => {
        const t = new InMemoryProject();
        t.addFileSync("Thing", "1");
        t.addFileSync("config/Thing", "1");
        defer(t, deleteFiles(t, "**/Thing", f => f.path.includes("config")));
        assert(t.fileCount === 2);
        t.flush()
            .then(_ => {
                assert(t.fileCount === 1);
            })
            .then(done, done);
    });

    it("replaces literals across project", done => {
        const p = tempProject();
        p.addFileSync("Thing", "A");
        p.addFileSync("config/Thing", "B");
        doWithFiles(p, "**/Thing", f => f.replaceAll("A", "alpha"))
            .then(_ => {
                assert(p.findFileSync("Thing").getContentSync() === "alpha");
            })
            .then(done, done);
    });

    it("replaces literals across project using array glob", done => {
        const p = tempProject();
        p.addFileSync("Thing", "A");
        p.addFileSync("config/Thing", "B");
        p.addFileSync("config/Cat", "A");
        doWithFiles(p, ["**/Thing", "**/Cat"], f => f.replaceAll("A", "alpha"))
            .then(_ => {
                assert(p.findFileSync("Thing").getContentSync() === "alpha");
                assert(p.findFileSync("config/Cat").getContentSync() === "alpha");
            })
            .then(done, done);
    });

    it("returns a rejected promise if any of the inner promises are rejected", async () => {
        const poo = new Error("This is terrible. But it won't be unhandled");
        const p = tempProject();
        p.addFileSync("Thing", "A");
        try {
            const result = await doWithFiles(p, "**/*", async f => {
                throw poo;
            });
            assert.fail("Unhandled Promise Rejection!!" + JSON.stringify(result));
        } catch (e) {
            assert.strictEqual(e.message, poo.message);
        }
    });

    it.skip("replaces regex across project", done => {
        const p = tempProject();
        p.addFileSync("Thing", "A");
        p.addFileSync("config/Thing", "B");
        doWithFiles(p, "**/Thing", f => f.replace(/A-Z/, "alpha"))
            .then(_ => {
                assert(p.findFileSync("Thing").getContentSync() === "alpha");
            })
            .then(done, done);
    });

    it("gathers correct count", async () => {
        const p = tempProject();
        p.addFileSync("Thing", "A");
        p.addFileSync("config/Thing", "B");
        p.addFileSync("pom.xml", "A");
        p.addFileSync("config/pom.xml", "B");
        const files = await gatherFromFiles(p,
            "**/pom.xml",
            async file => file);
        assert.strictEqual(files.length, 2);
    });

});
