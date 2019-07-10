import * as assert from "power-assert";

import { FileParser } from "../../../lib/tree/ast/FileParser";
import { DefaultFileParserRegistry } from "../../../lib/tree/ast/FileParserRegistry";

describe("FileParserRegistry", () => {

    it("should find parser", () => {
        const fp: FileParser = {
            rootName: "hotdog",
            toAst: f => { throw new Error(); },
        };
        const fpr = new DefaultFileParserRegistry().addParser(fp);
        assert.equal(fpr.parserFor("/hotdog/this"), fp);
    });

    it("should not find parser", () => {
        const fp: FileParser = {
            rootName: "hotdog",
            toAst: f => { throw new Error(); },
        };
        const fpr = new DefaultFileParserRegistry().addParser(fp);
        assert.equal(fpr.parserFor("/nothotdog/this"), undefined);
    });

    it("should pass validation", () => {
        const fp: FileParser = {
            rootName: "hotdog",
            toAst: f => { throw new Error(); },
            validate: pex => { /* Do nothing */ },
        };
        const fpr = new DefaultFileParserRegistry().addParser(fp);
        fpr.parserFor("/hotdog/this");
    });

    it("should spot invalid path expression", () => {
        const fp: FileParser = {
            rootName: "hotdog",
            toAst: f => { throw new Error(); },
            validate: pex => { throw new Error("invalid"); },
        };
        const fpr = new DefaultFileParserRegistry().addParser(fp);
        assert.throws(() => fpr.parserFor("/hotdog/this"));
    });
});
