import * as assert from "power-assert";
import { InMemoryFile } from "../../../lib/project/mem/InMemoryFile";
import { toSourceLocation } from "../../../lib/project/util/sourceLocationUtils";

describe("sourceLocationUtils", () => {

    it("should survive undefined", () => {
        const pos = toSourceLocation("x", undefined, 0);
        assert(pos === undefined);
    });

    it("should survive null", () => {
        // tslint:disable-next-line:no-null-keyword
        const pos = toSourceLocation("x", null, 0);
        assert(pos === undefined);
    });

    it("should survive negative value", () => {
        const pos = toSourceLocation("x", "this is valid", -474);
        assert(pos === undefined);
    });

    it("should survive out of range value", () => {
        const pos = toSourceLocation("x", "this is valid", +474);
        assert(pos === undefined);
    });

    it("should return start", () => {
        const path = "whatever";
        const pos = toSourceLocation(path, "this is valid", 0);
        assert.deepEqual(pos, { lineFrom1: 1, columnFrom1: 1, offset: 0, path });
    });

    it("should return second line", () => {
        const path = "this/is/good";
        const pos = toSourceLocation(path, "t\nhis is valid", 2);
        assert.deepEqual(pos, { lineFrom1: 2, columnFrom1: 1, offset: 2, path });
    });

    it("should handle blank line", () => {
        const f = new InMemoryFile("this/is/good", "");
        const pos = toSourceLocation(f, "t\n\nhis is valid", 3);
        assert.deepEqual(pos, { lineFrom1: 3, columnFrom1: 1, offset: 3, path: f.path });
    });

    it("should handle blank lines", () => {
        const f = new InMemoryFile("this/is/good", "");
        const pos = toSourceLocation(f, "t\n\n\nhis is valid", 5);
        assert.deepEqual(pos, { lineFrom1: 4, columnFrom1: 2, offset: 5, path: f.path });
    });

    it("should handle windows format", () => {
        const f = new InMemoryFile("this/is/good", "");
        const pos = toSourceLocation(f, "t\r\n\r\n\r\nhis is valid", 8);
        assert.deepEqual(pos, { lineFrom1: 4, columnFrom1: 2, offset: 8, path: f.path });
    });

});
