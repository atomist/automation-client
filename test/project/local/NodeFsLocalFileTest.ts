import * as appRoot from "app-root-path";

import * as fs from "fs";
import "mocha";

import * as assert from "power-assert";
import { NodeFsLocalFile } from "../../../src/project/local/NodeFsLocalFile";
import { tempProject } from "../utils";

describe("NodeFsLocalFile", () => {

    it("should read file and check content sync", () => {
        const f = new NodeFsLocalFile(appRoot.path, "package.json");
        assert(f.getContentSync());
        assert(f.getContentSync().indexOf("node") !== -1);
    });

    it("should read file and check content async", () => {
        const f = new NodeFsLocalFile(appRoot.path, "package.json");
        f.getContent().then(content => {
            assert(content);
            assert(content.indexOf("node") !== -1);
        });
    });

    it("should read file and check name and path in root", () => {
        const f = new NodeFsLocalFile(appRoot.path, "package.json");
        assert(f.path === "package.json");
        assert(f.name === "package.json");
    });

    it("should read file and check name in child package", () => {
        const f = new NodeFsLocalFile(appRoot.path, "config/default.json");
        assert(f.path === "config/default.json");
        assert(f.name === "default.json");
    });

    it("should created nested file", () => {
        const p = tempProject();
        p.addFileSync("config/Thing", "The quick brown");
        assert(p.findFileSync("config/Thing"));
    });

    it("should recordRename and read", done => {
        const p = tempProject();
        p.addFileSync("config/Thing", "The quick brown");
        const f = p.findFileSync("config/Thing");
        f.recordRename("Thing2");
        f.flush().then(_ => {
            assert(f.name === "Thing2");
            assert(f.path === "config/Thing2", `path was [${f.path}]`);
            done();
        }).catch(done);
    });

    it("should recordRename and read from disk", done => {
        const p = tempProject();
        p.addFileSync("config/Thing", "The quick brown");
        const f = p.findFileSync("config/Thing");
        f.recordRename("Thing2");
        f.flush()
            .then(_ => {
                assert(!p.findFileSync("config/Thing"));
                assert(p.findFileSync("config/Thing2"));
                done();
            })
            .catch(done);
    });

    it("should set content sync and read back", () => {
        const p = tempProject();
        p.addFileSync("Thing", "The quick brown");
        const f = p.findFileSync("Thing");
        assert(f.getContentSync() === "The quick brown");
        f.setContentSync("The slow brown");
        assert(f.getContentSync() === "The slow brown");
    });

    it("should record set content and read back from disk", done => {
        const p = tempProject();
        p.addFileSync("Thing", "The quick brown");
        const f = p.findFileSync("Thing");
        assert(f.getContentSync() === "The quick brown");
        f.recordSetContent("The slow brown")
            .flush()
            .then(() => {
                assert(f.getContentSync() === "The slow brown");
                done();
            },
        );
    });

    it("should set content and read back from disk", done => {
        const p = tempProject();
        p.addFileSync("Thing", "The quick brown");
        const f = p.findFileSync("Thing");
        assert(f.getContentSync() === "The quick brown");
        f.setContent("The slow brown")
            .then(() => {
                assert(f.getContentSync() === "The slow brown");
                done();
            },
        );
    });

    it("should recordReplace content and read back", done => {
        const p = tempProject();
        p.addFileSync("Thing", "The quick brown");
        const f = p.findFileSync("Thing");
        assert(!f.dirty);
        assert(f.getContentSync() === "The quick brown");
        f.recordReplace(/(The )([a-z]+)( brown)/, "$1slow$3");
        assert(f.dirty);
        f.flush().then(_ => {
            assert(f.getContentSync() === "The slow brown");
            done();
        });
    });

    it("should recordReplace content and read back from disk", done => {
        const p = tempProject();
        p.addFileSync("Thing", "The quick brown");
        const f = p.findFileSync("Thing");
        assert(f.getContentSync() === "The quick brown");
        f.recordReplace(/(The )([a-z]+)( brown)/, "$1slow$3")
            .flush()
            .then(() => {
                assert(f.getContentSync() === "The slow brown");
                done();
            },
        ).catch(done);
    });

    it("should recordReplaceAll and read back from disk", done => {
        const p = tempProject();
        p.addFileSync("Thing", "One two three");
        const f = p.findFileSync("Thing");
        assert(f.getContentSync() === "One two three");
        f.recordReplaceAll("e", "z")
            .flush()
            .then(() => {
                assert(f.getContentSync() === "Onz two thrzz");
                done();
            },
        ).catch(done);
    });

    it("should set path and read back", done => {
        const p = tempProject();
        p.addFileSync("Thing1", "The quick brown");
        const f = p.findFileSync("Thing1");
        assert(f.getContentSync() === "The quick brown");
        f.recordSetPath("Thing2");
        f.flush().then(_ => {
            assert(f.path === "Thing2");
            assert(!f.dirty);
            done();
        }).catch(done);
    });

    it("should set path and read back from disk", done => {
        const p = tempProject();
        p.addFileSync("Thing1", "The quick brown");
        const f = p.findFileSync("Thing1");
        assert(f.getContentSync() === "The quick brown");
        f.recordSetPath("Thing2");
        f.flush()
            .then(_ => {
                assert(p.findFileSync("Thing2"));
                assert(!p.findFileSync("Thing1"));
                done();
            })
            .catch(done);
    });

    it("should set path in different directory and read back from disk", done => {
        const p = tempProject();
        p.addFileSync("Thing1", "The quick brown");
        const f = p.findFileSync("Thing1");
        assert(f.getContentSync() === "The quick brown");
        f.recordSetPath("dir/Thing2");
        f.flush()
            .then(_ => {
                assert(p.findFileSync("dir/Thing2"));
                assert(!p.findFileSync("Thing1"));
                done();
            })
            .catch(done);
    });

    it("should test nonbinary file", done => {
        const p = tempProject();
        p.addFile("Thing1", "The quick brown")
            .then(() => {
                const f = p.findFileSync("Thing1");
                f.isBinary().then(bin => {
                    assert(!bin);
                    done();
                });
            })
            .catch(done);
    });

    it("should test binary file", done => {
        const p = tempProject();
        const img = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0"
            + "NAAAAKElEQVQ4jWNgYGD4Twzu6FhFFGYYNXDUwGFpIAk2E4dHDRw1cDgaCAASFOffhEIO"
            + "3gAAAABJRU5ErkJggg==";
        // Strip off the data: url prefix to get just the base64-encoded bytes
        const data = img.replace(/^data:image\/\w+;base64,/, "");
        const buf = new Buffer(data, "base64");
        fs.writeFileSync(p.baseDir + "/img", buf);
        const f = p.findFileSync("img");
        f.isBinary().then(bin => {
            assert(bin);
            done();
        }).catch(done);
    });

    it("should make a file executable", done => {
        const p = tempProject();
        p.addFile("runMe", "echo hooray")
            .then(pp =>
                pp.findFile("runMe").then(file => {
                    console.log(file.path);
                    return file.isExecutable().then(before => {
                        assert(!before, "should not be created executable " + (tempProject as any).baseDir);
                        return pp.makeExecutable("runMe").then(_ =>
                            Promise.all([file.isExecutable(), file.isReadable()]).then(checks => {
                                const [executable, readable] = checks;
                                assert(executable, "should be executable now");
                                assert(readable, "should still be readable");
                                done();
                            }));
                    });
                }))
            .catch(done);

    });
});
