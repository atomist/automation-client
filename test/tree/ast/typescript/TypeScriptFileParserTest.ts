import { evaluateScalar, evaluateScalarValue, evaluateScalarValues } from "@atomist/tree-path/path/expressionEngine";
import { TreeVisitor, visit } from "@atomist/tree-path/visitor";
import "mocha";
import * as assert from "power-assert";
import { fail } from "power-assert";
import { InMemoryFile } from "../../../../src/project/mem/InMemoryFile";
import { InMemoryProject } from "../../../../src/project/mem/InMemoryProject";
import { findMatches } from "../../../../src/tree/ast/astUtils";
import {
    TypeScriptES6FileParser,
    TypeScriptFileParser,
} from "../../../../src/tree/ast/typescript/TypeScriptFileParser";

describe("TypeScriptFileParser", () => {

    it("should handle ill-formed file");

    it("should parse a file", done => {
        const f = new InMemoryFile("script.ts", "const x = 1;");
        TypeScriptES6FileParser
            .toAst(f)
            .then(root => {
                // console.log(JSON.stringify(root, null, 2));
                assert(root.$name === "SourceFile");
                done();
            }).catch(done);
    });

    it("should parse a file and use a path expression to find a node", done => {
        const f = new InMemoryFile("script.ts", "const x = 1;");
        TypeScriptES6FileParser
            .toAst(f)
            .then(root => {
                // console.log(JSON.stringify(root, null, 2));
                const value = evaluateScalar(root, "//VariableDeclarationList");
                assert(!!value);
                done();
            }).catch(done);
    });

    it("should reject invalid path expression", done => {
        const f = new InMemoryFile("script.ts", "const x = 1;");
        TypeScriptES6FileParser
            .toAst(f)
            .then(root => {
                try {
                    evaluateScalarValue(root, "//xxVariableDeclaration/Identifier");
                    fail("Should have rejected invalid path expression");
                } catch (e) {
                    // Ok
                    done();
                }
            }).catch(done);
    });

    it("should parse a file and use a path expression to find a value", done => {
        const f = new InMemoryFile("script.ts", "const x = 1;");
        TypeScriptES6FileParser
            .toAst(f)
            .then(root => {
                const value = evaluateScalarValue(root, "//VariableDeclaration/Identifier");
                assert(value === "x");
                done();
            }).catch(done);
    });

    it("should parse a file and use a path expression to find values", done => {
        const f = new InMemoryFile("script.ts", "const x = 1; let y = 2;");
        TypeScriptES6FileParser
            .toAst(f)
            .then(root => {
                const values = evaluateScalarValues(root, "//Identifier");
                assert.deepEqual(values, ["x", "y"]);
                done();
            }).catch(done);
    });

    it("should parse a file and keep positions", done => {
        const f = new InMemoryFile("script.ts", "const x = 1; let y = 2;");
        TypeScriptES6FileParser
            .toAst(f)
            .then(root => {
                assert(root.$name === "SourceFile");
                let minOffset = -1;
                let terminalCount = 0;
                const v: TreeVisitor = tn => {
                    if (tn.$name !== "people") {
                        assert(tn.$offset !== undefined, `No offset on node with name ${tn.$name}`);
                        assert(tn.$offset >= minOffset, `Must have position for ${JSON.stringify(tn)}`);
                        if (!!tn.$value) {
                            ++terminalCount;
                            // It's a terminal
                            assert(f.getContentSync().substr(tn.$offset, tn.$value.length) === tn.$value,
                                `Unable to validate content for ${JSON.stringify(tn)}`);
                        }
                        minOffset = tn.$offset;
                    }
                    return true;
                };
                visit(root, v);
                assert(terminalCount > 0);
                done();
            }).catch(done);
    });

    it("should parse project and use a path expression to find a value", done => {
        const p = InMemoryProject.of({path: "script.ts", content: "const x = 1;"});
        findMatches(p, TypeScriptES6FileParser,
            "**/*.ts",
            "//VariableDeclaration/Identifier")
            .then(matchResults => {
                // console.log(JSON.stringify(root, null, 2));
                assert(matchResults.length === 1);
                assert(matchResults[0].$value === "x");
                done();
            }).catch(done);
    });

    it("should parse project and use a path expression to find and update a value", done => {
        const p = InMemoryProject.of({path: "script.ts", content: "const x = 1;"});
        findMatches(p, TypeScriptES6FileParser,
            "**/*.ts",
            "//VariableDeclaration/Identifier")
            .then(matchResults => {
                // console.log(JSON.stringify(root, null, 2));
                assert(matchResults.length === 1);
                assert(matchResults[0].$value === "x");
                matchResults[0].$value = "y";
                p.flush().then(_ => {
                    const f = p.findFileSync("script.ts");
                    assert(f.getContentSync() === "const y = 1;");
                    done();
                });
            }).catch(done);
    });

});
