import * as assert from "power-assert";

import "mocha";
import { InMemoryFile } from "../../../src/project/mem/InMemoryFile";
import { InMemoryProject } from "../../../src/project/mem/InMemoryProject";
import { findMatches, zapAllMatches } from "../../../src/tree/ast/astUtils";
import { ZapTrailingWhitespace } from "../../../src/tree/ast/FileHits";
import { TypeScriptES6FileParser } from "../../../src/tree/ast/typescript/TypeScriptFileParser";

describe("astUtils", () => {

    describe("function registry", () => {

        it("works", done => {
            const f = new InMemoryFile("src/test.ts",
                "const x: number = 10; const y = 13; const xylophone = 3;");
            const p = InMemoryProject.of(f);
            findMatches(p,
                TypeScriptES6FileParser,
                "src/**/*.ts",
                "//VariableDeclaration[?check]/Identifier",
                { check: n => n.$value.includes("x")})
                .then(matches => {
                    assert(matches.length === 2);
                    assert.deepEqual(matches.map(m => m.$value), ["x", "xylophone"]);
                    done();
                }).catch(done);
        });

    });

    describe("zapAllMatches", () => {

        it("should zap simple", done => {
            const f = new InMemoryFile("src/test.ts", "const x: number = 10;");
            const p = InMemoryProject.of(f);
            zapAllMatches(p, TypeScriptES6FileParser,
                "src/**/*.ts",
                `//VariableDeclaration//ColonToken/following-sibling::* |
                                    //VariableDeclaration//ColonToken`)
                .then(() => {
                    const f2 = p.findFileSync(f.path);
                    assert.equal(f2.getContentSync(), "const x  = 10;");
                    done();
                }).catch(done);
        });

        it("#105: should zap match and zap following whitespace", done => {
            const f = new InMemoryFile("src/test.ts", "const x: number = 10;");
            const p = InMemoryProject.of(f);
            zapAllMatches(p, TypeScriptES6FileParser,
                "src/**/*.ts",
                `//VariableDeclaration//ColonToken/following-sibling::* |
                                    //VariableDeclaration//ColonToken`,
                ZapTrailingWhitespace)
                .then(() => {
                    const f2 = p.findFileSync(f.path);
                    assert.equal(f2.getContentSync(), "const x= 10;");
                    done();
                }).catch(done);
        });

        it("#105: should zap match and replace following whitespace", done => {
            const f = new InMemoryFile("src/test.ts", "const x: number = 10;");
            const p = InMemoryProject.of(f);
            zapAllMatches(p, TypeScriptES6FileParser,
                "src/**/*.ts",
                `//VariableDeclaration//ColonToken/following-sibling::* |
                                    //VariableDeclaration//ColonToken`,
                {replaceAfter: {after: /\s*/, replacement: " "}})
                .then(() => {
                    const f2 = p.findFileSync(f.path);
                    assert.equal(f2.getContentSync(), "const x = 10;");
                    done();
                }).catch(done);
        });

    });

});
