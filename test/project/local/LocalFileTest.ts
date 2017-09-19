import "mocha";
import "tmp";

import * as appRoot from "app-root-path";
import { LocalFile } from "../../../src/project/local/LocalFile";

import * as assert from "power-assert";
import { NodeFsLocalFile } from "../../../src/project/local/NodeFsLocalFile";
import { tempProject } from "../Utils";

describe("LocalFile", () => {

    it("should read file and check content sync", () => {
        const f = new NodeFsLocalFile(appRoot, "package.json");
        assert(f.getContentSync());
        assert(f.getContentSync().indexOf("node") !== -1);
    });

    it("should read file and check content async", () => {
        const f = new NodeFsLocalFile(appRoot, "package.json");
        f.getContent().then(content => {
            assert(content);
            assert(content.indexOf("node") !== -1);
        });
    });

    it("should read file and check name and path in root", () => {
        const f = new NodeFsLocalFile(appRoot, "package.json");
        assert(f.path === "package.json");
        assert(f.name === "package.json");
    });

    it("should read file and check name in child package", () => {
        const f = new NodeFsLocalFile(appRoot, "config/default.json");
        assert(f.path === "config/default.json");
        assert(f.name === "default.json");
    });

    it("should created nested file", () => {
        const p = tempProject();
        p.addFileSync("config/Thing", "The quick brown");
        assert(p.findFileSync("config/Thing"));
    });

    it("should recordRename and read", () => {
        const p = tempProject();
        p.addFileSync("config/Thing", "The quick brown");
        const f = p.findFileSync("config/Thing");
        f.recordRename("Thing2");
        assert(f.name === "Thing2");
        assert(f.path === "config/Thing2", `path was [${f.path}]`);
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

    it("should set content and read back", () => {
        const p = tempProject();
        p.addFileSync("Thing", "The quick brown");
        const f = p.findFileSync("Thing");
        assert(f.getContentSync() === "The quick brown");
        f.recordSetContent("The slow brown");
        assert(f.getContentSync() === "The slow brown");
    });

    it("should set content and read back from disk", done => {
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

    it("should recordReplace content and read back", () => {
        const p = tempProject();
        p.addFileSync("Thing", "The quick brown");
        const f = p.findFileSync("Thing");
        assert(!f.dirty);
        assert(f.getContentSync() === "The quick brown");
        f.recordReplace(/(The )([a-z]+)( brown)/, "$1slow$3");
        assert(f.dirty);
        assert(f.getContentSync() === "The slow brown");
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

    it("should set path and read back", () => {
        const p = tempProject();
        p.addFileSync("Thing1", "The quick brown");
        const f = p.findFileSync("Thing1");
        assert(f.getContentSync() === "The quick brown");
        f.recordSetPath("Thing2");
        assert(f.path === "Thing2");
        assert(f.dirty);
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

});
