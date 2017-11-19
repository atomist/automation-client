import * as assert from "power-assert";

import "mocha";
import { InMemoryFile } from "../../../src/project/mem/InMemoryFile";
import { InMemoryProject } from "../../../src/project/mem/InMemoryProject";
import { zapAllMatches } from "../../../src/tree/ast/astUtils";
import { TypeScriptES6FileParser } from "../../../src/tree/ast/typescript/TypeScriptFileParser";

describe("astUtils", () => {

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

        it.skip("should zap match and zap following whitespace", done => {
            const f = new InMemoryFile("src/test.ts", "const x: number = 10;");
            const p = InMemoryProject.of(f);
            zapAllMatches(p, TypeScriptES6FileParser,
                "src/**/*.ts",
                `//VariableDeclaration//ColonToken/following-sibling::* |
                                    //VariableDeclaration//ColonToken`,
                { zapTrailingSpaces: true })
                .then(() => {
                    const f2 = p.findFileSync(f.path);
                    assert.equal(f2.getContentSync(), "const x = 10;");
                    done();
                }).catch(done);
        });

    });

});
