import { evaluateExpression, evaluateScalar, evaluateScalarValue } from "@atomist/tree-path/path/expressionEngine";
import "mocha";
import * as assert from "power-assert";
import { InMemoryFile } from "../../../../src/project/mem/InMemoryFile";
import { TypeScriptFileParser } from "../../../../src/tree/ast/typescript/TypeScriptFileParser";
import { TreeNode } from "@atomist/tree-path/TreeNode";

describe("TypeScriptFileParser", () => {

    it("should handle ill-formed file");

    it("should parse a file", done => {
        const f = new InMemoryFile("script.ts", "const x = 1;");
        new TypeScriptFileParser()
            .toAst(f)
            .then(root => {
                console.log(JSON.stringify(root, null, 2));
                assert(root.$name === "SourceFile");
                done();
            }).catch(done);
    });

    it("should parse a file and use a path expression to find a node", done => {
        const f = new InMemoryFile("script.ts", "const x = 1;");
        new TypeScriptFileParser()
            .toAst(f)
            .then(root => {
               // console.log(JSON.stringify(root, null, 2));
                const value = evaluateScalar(root, "//VariableDeclarationList");
                assert(!!value);
                console.log(JSON.stringify(value));
                done();
            }).catch(done);
    });

    it("should parse a file and use a path expression to find a value", done => {
        const f = new InMemoryFile("script.ts", "const x = 1;");
        new TypeScriptFileParser()
            .toAst(f)
            .then(root => {
                // console.log(JSON.stringify(root, null, 2));
                const value = evaluateScalarValue(root, "//VariableDeclaration/Identifier");
                assert(value === "x");
                done();
            }).catch(done);
    });

    it("should parse a file and use a path expression to find values", done => {
        const f = new InMemoryFile("script.ts", "const x = 1; let y = 2;");
        new TypeScriptFileParser()
            .toAst(f)
            .then(root => {
                const values = (evaluateExpression(root, "//Identifier") as TreeNode[])
                    .map(n => n.$value);
                assert.deepEqual(values, [ "x", "y"]);
                done();
            }).catch(done);
    });

    // it("should parse a file and allow array navigation via property with a nested grammar", done => {
    //     const f = new InMemoryFile("Family", "Linda:[2007, mushrooms] Evelyn:[2005, sugar]");
    //     const mg = Microgrammar.fromString<Kid>("${name}:${fact}", {
    //         fact: Microgrammar.fromString<KidFact>("[${birthYear},${food}]", {
    //             birthYear: Integer,
    //         }),
    //     });
    //     new MicrogrammarBasedFileParser("family", "kid", mg)
    //         .toAst(f)
    //         .then(root => {
    //             console.log(JSON.stringify(root, null, 2));
    //             // Check the array property
    //             const linda = (root as any).kids[0] as Kid & TreeNode;
    //             assert(linda.name === "Linda", "Name=" + linda.name);
    //             const evelyn = (root as any).kids[1] as Kid & TreeNode;
    //             assert(evelyn.name === "Evelyn", "Name=" + evelyn.name);
    //             // this Integer-matcher should be converting it to a number automatically. microgrammar#34
    //             assert(+evelyn.fact.birthYear === 2005, "birth year " + evelyn.fact.birthYear );
    //             assert(evelyn.fact.food === "sugar");
    //             done();
    //         }).catch(done);
    // });
    //
    // it("should parse a file and keep positions", done => {
    //     const f = new InMemoryFile("Thing", "Tom:16 Mary:25");
    //     const mg = Microgrammar.fromString<Person>("${name}:${age}", {
    //         age: Integer,
    //     });
    //     new MicrogrammarBasedFileParser("people", "person", mg)
    //         .toAst(f)
    //         .then(root => {
    //             assert(root.$name === "people");
    //             let minOffset = -1;
    //             let terminalCount = 0;
    //             const v: TreeVisitor = tn => {
    //                 console.log(tn.$name + "=" + tn.$value + ",offset=" + tn.$offset);
    //                 if (tn.$name !== "people") {
    //                     assert(tn.$offset !== undefined, `No offset on node with name ${tn.$name}`);
    //                     assert(tn.$offset >= minOffset, `Must have position for ${JSON.stringify(tn)}`);
    //                     if (!!tn.$value) {
    //                         ++terminalCount;
    //                         // It's a terminal
    //                         assert(f.getContentSync().substr(tn.$offset, tn.$value.length) === tn.$value,
    //                             `Unable to validate content for ${JSON.stringify(tn)}`);
    //                     }
    //                     minOffset = tn.$offset;
    //                 }
    //                 return true;
    //             };
    //             visit(root, v);
    //             assert(terminalCount > 0);
    //             done();
    //         }).catch(done);
    // });

});
