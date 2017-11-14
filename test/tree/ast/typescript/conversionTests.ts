import "mocha";

import * as assert from "power-assert";
import { InMemoryFile } from "../../../../src/project/mem/InMemoryFile";
import { InMemoryProject } from "../../../../src/project/mem/InMemoryProject";
import { findMatches } from "../../../../src/tree/ast/astUtils";
import { TypeScriptES6FileParser } from "../../../../src/tree/ast/typescript/TypeScriptFileParser";

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
                console.log(JSON.stringify(values[0], (key, value) => key === "$parent" ? undefined : value, 2));
                assert(values.length === 1);
                console.log(`Value is [${values[0].$value}]`);
                assert(values[0].$value === ":");
                done();
            }).catch(done);
    });

});
