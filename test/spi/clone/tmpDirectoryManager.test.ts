import * as fs from "fs-extra";
import * as os from "os";
import * as path from "path";
import * as assert from "power-assert";
import { TmpDirectoryManager } from "../../../lib/spi/clone/tmpDirectoryManager";
import { execPromise } from "../../../lib/util/child_process";

describe("spi/clone/tmpDirectoryManager", () => {

    describe("TmpDirectoryManager", () => {

        describe("filters", () => {

            it("should pass everything through noFilter", () => {
                [undefined, "", "a", "file", "œ∑é®†¥¨ˆøπ"].forEach(d => {
                    assert(TmpDirectoryManager.noFilter(d));
                });
            });

            it("should not pass new directories through ageFilter", async () => {
                const d = await TmpDirectoryManager.directoryFor("anOwner", "aRepo", "abranch", { keep: false });
                assert(TmpDirectoryManager.ageFilter()(path.basename(d.path)) === false);
                await fs.remove(d.path);
            });

            it("should pass old directories through ageFilter", async () => {
                const d = await TmpDirectoryManager.directoryFor("anOwner", "aRepo", "abranch", { keep: false });
                assert(TmpDirectoryManager.ageFilter(1, Date.now() + 1000)(path.basename(d.path)) === true);
                await fs.remove(d.path);
            });

        });

        describe("reap", () => {

            let origReaddir: any;
            let origRemove: any;
            const pid = process.pid;
            let entries: string[];
            let removed: string[];
            before(() => {
                origReaddir = Object.getOwnPropertyDescriptor(fs, "readdir");
                origRemove = Object.getOwnPropertyDescriptor(fs, "remove");
                Object.defineProperty(fs, "readdir", {
                    value: async (b: string): Promise<string[]> => {
                        assert(b === os.tmpdir());
                        return entries;
                    },
                });
                Object.defineProperty(fs, "remove", {
                    value: async (b: string): Promise<void> => {
                        removed.push(b);
                    },
                });
            });
            beforeEach(() => {
                removed = [];
            });
            after(() => {
                Object.defineProperty(fs, "readdir", origReaddir);
                Object.defineProperty(fs, "remove", origRemove);
            });

            it("should reap all its own directories", async () => {
                entries = ["gvsb", "cruise", "yourself"].map(t => `atm-${pid}-${t}`);
                await TmpDirectoryManager.reap();
                const e = entries.map(b => path.join(TmpDirectoryManager.root, b));
                assert.deepStrictEqual(removed, e);
            });

            it("should ignore other directories", async () => {
                entries = ["gvsb", "cruise", "yourself"].map(t => `atm-${pid - 1}-${t}`);
                entries.push("Something", "Totally", "differ.ent", "œ∑é®†¥¨ˆøπ");
                await TmpDirectoryManager.reap();
                assert.deepStrictEqual(removed, []);
            });

            it("should only reap its own directories", async () => {
                const other = `atm-${pid + 1}-other`;
                const mine = `atm-${pid}-mine`;
                entries = ["polvo", other, mine, "Totemic"];
                await TmpDirectoryManager.reap();
                const e = [mine].map(b => path.join(TmpDirectoryManager.root, b));
                assert.deepStrictEqual(removed, e);
            });

            it("should handle nothing", async () => {
                entries = [];
                await TmpDirectoryManager.reap();
                assert.deepStrictEqual(removed, []);
            });

        });

        describe("directoryFor", () => {

            it("deletes the directory if keep is false", async () => {
                const d = await TmpDirectoryManager.directoryFor("anOwner", "aRepo", "abranch", { keep: false });
                assert(await fs.stat(d.path), "directory not created");
                await execPromise("git", ["init"], { cwd: d.path }); // make it a little difficult
                await d.release();
                let thrown = false;
                try {
                    const stat = await fs.stat(d.path);
                } catch (e) {
                    thrown = true;
                    if (e.code !== "ENOENT") {
                        await fs.remove(d.path);
                        assert.fail("directory should not exist");
                    }
                }
                if (!thrown) {
                    await fs.remove(d.path);
                    assert.fail("directory was not deleted");
                }
            });

            it("does not delete the directory if keep is true", async () => {
                const d = await TmpDirectoryManager.directoryFor("anOwner", "aRepo", "abranch", { keep: true });
                assert(await fs.stat(d.path), "directory not created");
                await d.release();
                try {
                    const stat = await fs.stat(d.path);
                } catch (e) {
                    assert.strictEqual(e.code, "ENOENT", "directory was deleted");
                    throw e;
                }
                await fs.remove(d.path);
            });

        });

    });

});
