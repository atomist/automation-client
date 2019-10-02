import { CFamilyLangHelper } from "@atomist/microgrammar/lib/matchers/lang/cfamily/CFamilyLangHelper";
import {
    parsePathExpression,
    UnionPathExpression,
} from "@atomist/tree-path";
import * as assert from "power-assert";
import { InMemoryFile } from "../../../../lib/project/mem/InMemoryFile";
import { InMemoryProject } from "../../../../lib/project/mem/InMemoryProject";
import {
    matches,
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

    it("finds token and gets value", async () => {
        const f = new InMemoryFile("src/test.ts", "const s: string = '64';");
        const p = InMemoryProject.of(f);

        const values = await matches(p, {
            parseWith: TypeScriptES6FileParser,
            globPatterns: "src/**/*.ts",
            pathExpression: "//VariableDeclaration//ColonToken[/following-sibling::*]",
        });
        // console.log(stringify(values[0],
        //    (key, value) => ["$parent", "node", "sourceFile"].includes(key) ? undefined : value, 2));
        assert.equal(values.length, 1);
        // console.log(`Value is [${values[0].$value}]`);
        assert.equal(values[0].$value, ":");
    });

    it("removes type annotation on variable declaration", removesTypeAnnotationsIn("const s: string = '64';", "const s = '64';"));

    it("removes type annotation on function parameter type",
        removesTypeAnnotationsIn("function f(n: number) { return 'x'; }", "function f(n) { return 'x'; }"));

    it("removes type annotation on function parameter type and return type",
        removesTypeAnnotationsIn("function f(n: number): string { return 'x'; }", "function f(n) { return 'x'; }"));

    it("removes type annotation on function return type",
        removesTypeAnnotationsIn("function f(): string { return 'x'; }", "function f() { return 'x'; }"));

    it("removes interface",
        removesTypeAnnotationsIn("interface Thing { flag: boolean; }\nfunction f(): string { return 'x'; }",
            "function f() { return 'x'; }"));

    it("removes type definition",
        removesTypeAnnotationsIn("type Thing = string;\nfunction f(): string { return 'x'; }",
            "function f() { return 'x'; }"));

    it("removes member parameter and return types",
        removesTypeAnnotationsIn("class Foo { it(n: number): string { return 'something'; } }",
            "class Foo { it(n) { return 'something'; } }"));

    it.skip("removes implementation of interface",
        removesTypeAnnotationsIn("class Foo implements Bar { it(n: number): string { return 'something'; } }",
            "class Foo { it(n) { return 'something'; } }"));

    function removesTypeAnnotationsIn(src: string, after: string): () => Promise<void> {
        return async () => {
            const f = new InMemoryFile("src/test.ts", src);
            const p = InMemoryProject.of(f);

            await zapAllMatches(p, TypeScriptES6FileParser, "src/**/*.ts", allTypeElements);
            const f2 = p.findFileSync(f.path);
            const h = new CFamilyLangHelper();
            // TODO should be able to use this
            // assert.equal(h.stripWhitespace(f2.getContentSync()),
            //    h.stripWhitespace(after));
            assert.strictEqual(f2.getContentSync().replace(/\s+/g, ""), after.replace(/\s+/g, ""));
        };
    }

});
