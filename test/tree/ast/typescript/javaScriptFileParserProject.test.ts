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
describe("TypeScriptFileParser real project parsing: JavaScript", () => {

    const thisProject = new NodeFsLocalProject("automation-client", appRoot.path, () => Promise.resolve());

    it("should parse sources from project and use a path expression to find values", async () => {
        const matchResults = await matches(thisProject, {
            parseWith: TypeScriptES6FileParser,
            globPatterns: "lib/tree/ast/typescript/*.js",
            pathExpression: "//ClassDeclaration/Identifier",
        });
        assert(matchResults.map(m => m.$value).includes(TypeScriptFileParser.name));
    }).timeout(15000);

    it("should parse sources from project and use a path expression to find values using convenience method", async () => {
        const values = await findValues(thisProject, TypeScriptES6FileParser, "lib/tree/ast/typescript/*.js", "//ClassDeclaration/Identifier");
        assert(values.includes(TypeScriptFileParser.name));
    }).timeout(15000);

    it("should parse sources from project and find functions", async () => {
        const values = await findValues(thisProject, TypeScriptES6FileParser, "lib/tree/ast/**/*.js", "//FunctionDeclaration/Identifier");
        assert(values.length > 2);
    }).timeout(15000);

});
