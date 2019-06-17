import { CFamilyLangHelper } from "@atomist/microgrammar/lib/matchers/lang/cfamily/CFamilyLangHelper";
import {
    parsePathExpression,
    UnionPathExpression,
} from "@atomist/tree-path";
import "mocha";
import * as assert from "power-assert";
import { InMemoryFile } from "../../../../lib/project/mem/InMemoryFile";
import { InMemoryProject } from "../../../../lib/project/mem/InMemoryProject";
import {
    findMatches,
    zapAllMatches,
} from "../../../../lib/tree/ast/astUtils";
import { TypeScriptES6FileParser } from "../../../../lib/tree/ast/typescript/TypeScriptFileParser";

const allTypeMatches = [
    "//VariableDeclaration//ColonToken/following-sibling::*",
    "//VariableDeclaration//ColonToken",
    "//FunctionDeclaration//ColonToken/following-sibling::*",
    "//FunctionDeclaration//ColonToken",
    "//MethodDeclaration//ColonToken/following-sibling::*",
    "//MethodDeclaration//ColonToken",
    "//InterfaceDeclaration",
    "//TypeAliasDeclaration",
];

const allTypeElements: UnionPathExpression = {
    unions: allTypeMatches.map(parsePathExpression),
};

/**
 * Experiments in large scale editing: Removing type annotations etc
 */
describe("path expression driven conversion", () => {

    it("finds token and gets value", done => {
        const f = new InMemoryFile("src/test.ts", "const s: string = '64';");
        const p = InMemoryProject.of(f);

        findMatches(p, TypeScriptES6FileParser,
            "src/**/*.ts",
            "//VariableDeclaration//ColonToken[/following-sibling::*]")
            .then(values => {
                // console.log(stringify(values[0],
                //    (key, value) => ["$parent", "node", "sourceFile"].includes(key) ? undefined : value, 2));
                assert.equal(values.length, 1);
                // console.log(`Value is [${values[0].$value}]`);
                assert.equal(values[0].$value, ":");
                done();
            }).catch(done);
    });

    it("removes type annotation on variable declaration", done =>
        removesTypeAnnotationsIn("const s: string = '64';",
            "const s = '64';", done));

    it("removes type annotation on function parameter type", done =>
        removesTypeAnnotationsIn("function f(n: number) { return 'x'; }",
            "function f(n) { return 'x'; }", done));

    it("removes type annotation on function parameter type and return type", done =>
        removesTypeAnnotationsIn("function f(n: number): string { return 'x'; }",
            "function f(n) { return 'x'; }", done));

    it("removes type annotation on function return type", done =>
        removesTypeAnnotationsIn("function f(): string { return 'x'; }",
            "function f() { return 'x'; }", done));

    it("removes interface", done =>
        removesTypeAnnotationsIn("interface Thing { flag: boolean; }\nfunction f(): string { return 'x'; }",
            "function f() { return 'x'; }", done));

    it("removes type definition", done =>
        removesTypeAnnotationsIn("type Thing = string;\nfunction f(): string { return 'x'; }",
            "function f() { return 'x'; }", done));

    it("removes member parameter and return types", done =>
        removesTypeAnnotationsIn("class Foo { it(n: number): string { return 'something'; } }",
            "class Foo { it(n) { return 'something'; } }", done));

    it.skip("removes implementation of interface", done =>
        removesTypeAnnotationsIn("class Foo implements Bar { it(n: number): string { return 'something'; } }",
            "class Foo { it(n) { return 'something'; } }", done));

    function removesTypeAnnotationsIn(src: string, after: string, done) {
        const f = new InMemoryFile("src/test.ts", src);
        const p = InMemoryProject.of(f);

        zapAllMatches(p, TypeScriptES6FileParser,
            "src/**/*.ts",
            allTypeElements)
            .then(() => {
                const f2 = p.findFileSync(f.path);
                const h = new CFamilyLangHelper();
                // TODO should be able to use this
                // assert.equal(h.stripWhitespace(f2.getContentSync()),
                //    h.stripWhitespace(after));
                assert.equal(f2.getContentSync().replace(/\s+/g, ""),
                    after.replace(/\s+/g, ""));
                done();
            }).catch(done);
    }

});
