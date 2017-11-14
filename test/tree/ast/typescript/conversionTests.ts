import "mocha";

import { UnionPathExpression } from "@atomist/tree-path/path/pathExpression";
import { parsePathExpression } from "@atomist/tree-path/path/pathExpressionParser";
import * as assert from "power-assert";
import { InMemoryFile } from "../../../../src/project/mem/InMemoryFile";
import { InMemoryProject } from "../../../../src/project/mem/InMemoryProject";
import { findMatches } from "../../../../src/tree/ast/astUtils";
import { TypeScriptES6FileParser } from "../../../../src/tree/ast/typescript/TypeScriptFileParser";

import { CFamilyLangHelper } from "@atomist/microgrammar/matchers/lang/cfamily/CFamilyLangHelper";

const allTypeMatches = [
    "//VariableDeclaration//ColonToken/following-sibling::*",
    "//VariableDeclaration//ColonToken",
];

const allWhiteSpace: UnionPathExpression = {
    unions: allTypeMatches.map(pe => parsePathExpression(pe)),
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
                console.log(JSON.stringify(values[0],
                    (key, value) => ["$parent", "node", "sourceFile"].includes(key) ? undefined : value, 2));
                assert(values.length === 1);
                console.log(`Value is [${values[0].$value}]`);
                assert(values[0].$value === ":");
                done();
            }).catch(done);
    });

    it("removes type annotation on variable declaration", done =>
        removesTypeAnnotationsIn("const s: string = '64';",
            "const s  = '64';", done));

    function removesTypeAnnotationsIn(src: string, after: string, done) {
        const f = new InMemoryFile("src/test.ts", src);
        const p = InMemoryProject.of(f);

        findMatches(p, TypeScriptES6FileParser,
            "src/**/*.ts",
            allWhiteSpace)
            .then(values => {
                assert(values.length === 2);
                console.log(`Value is [${values[0].$value}]`);
                // Zapify them
                values.forEach(v => v.$value = "");
                return p.flush();
            })
            .then(() => {
                const f2 = p.findFileSync(f.path);
                const h = new CFamilyLangHelper();
                assert.equal(h.canonicalize(f2.getContentSync()),
                    h.canonicalize(after));
                done();
            }).catch(done);
    }

});
