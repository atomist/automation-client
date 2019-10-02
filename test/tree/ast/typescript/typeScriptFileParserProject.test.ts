import * as appRoot from "app-root-path";
import * as assert from "power-assert";
import { NodeFsLocalProject } from "../../../../lib/project/local/NodeFsLocalProject";
import {
    findValues,
    matches,
} from "../../../../lib/tree/ast/astUtils";
import {
    TypeScriptES6FileParser,
    TypeScriptFileParser,
} from "../../../../lib/tree/ast/typescript/TypeScriptFileParser";

/**
 * Parse sources in this project
 */
describe("TypeScriptFileParser real project parsing: TypeScript", () => {

    const thisProject = new NodeFsLocalProject("automation-client", appRoot.path, () => Promise.resolve());

    it("should parse sources from project and use a path expression to find values", async () => {
        const matchResults = await matches(thisProject, {
            parseWith: TypeScriptES6FileParser,
            globPatterns: "lib/tree/ast/typescript/*Parser.ts",
            pathExpression: "//ClassDeclaration/Identifier",
        });
        assert.deepEqual(matchResults.map(m => m.$value), ["TypeScriptFileParser", "TypeScriptAstNodeTreeNode"]);
    }).timeout(15000);

    it("should parse sources from project and use a path expression to find values using convenience method", async () => {
        const values = await findValues(thisProject, TypeScriptES6FileParser, "lib/tree/ast/typescript/*Parser.ts", "//ClassDeclaration/Identifier");
        assert.deepEqual(values, ["TypeScriptFileParser", "TypeScriptAstNodeTreeNode"]);
    }).timeout(15000);

    it("should parse sources from project and find functions", async () => {
        const values = await findValues(thisProject, TypeScriptES6FileParser, "lib/tree/ast/**/*.ts", "//FunctionDeclaration/Identifier");
        assert(values.length > 2);
    }).timeout(15000);

    it("should parse sources from project and find exported functions", async () => {
        const values = await matches(thisProject, {
            parseWith: TypeScriptES6FileParser,
            globPatterns: "lib/tree/ast/**/*.ts",
            pathExpression: "//FunctionDeclaration[//ExportKeyword]//Identifier",
        });
        assert(values.length > 2);
    }).timeout(15000);

    it("should find all exported functions in project", async () => {
        const values = await findValues(thisProject, TypeScriptES6FileParser, "lib/project/*.ts",
            "//FunctionDeclaration[//ExportKeyword]//Identifier");
        assert(values.length > 5);
    }).timeout(15000);

});
