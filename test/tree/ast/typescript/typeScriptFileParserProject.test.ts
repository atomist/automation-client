import * as appRoot from "app-root-path";
import * as assert from "power-assert";
import { NodeFsLocalProject } from "../../../../lib/project/local/NodeFsLocalProject";
import {
    findMatches,
    findValues,
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

    it("should parse sources from project and use a path expression to find values", done => {
        findMatches(thisProject, TypeScriptES6FileParser,
            "lib/tree/ast/typescript/*Parser.ts",
            "//ClassDeclaration/Identifier")
            .then(matchResults => {
                assert.deepEqual(matchResults.map(m => m.$value),
                    ["TypeScriptFileParser", "TypeScriptAstNodeTreeNode"]);
                done();
            }).catch(done);
    }).timeout(15000);

    it("should parse sources from project and use a path expression to find values using convenience method", done => {
        findValues(thisProject, TypeScriptES6FileParser,
            "lib/tree/ast/typescript/*Parser.ts",
            "//ClassDeclaration/Identifier")
            .then(values => {
                assert.deepEqual(values,
                    ["TypeScriptFileParser", "TypeScriptAstNodeTreeNode"]);
                done();
            }).catch(done);
    }).timeout(15000);

    it("should parse sources from project and find functions", done => {
        findValues(thisProject, TypeScriptES6FileParser,
            "lib/tree/ast/**/*.ts",
            "//FunctionDeclaration/Identifier")
            .then(values => {
                assert(values.length > 2);
                done();
            }).catch(done);
    }).timeout(15000);

    it("should parse sources from project and find exported functions", done => {
        findMatches(thisProject, TypeScriptES6FileParser,
            "lib/tree/ast/**/*.ts",
            "//FunctionDeclaration[//ExportKeyword]//Identifier")
            .then(values => {
                assert(values.length > 2);
                done();
            }).catch(done);
    }).timeout(15000);

    it("should find all exported functions in project", done => {
        findValues(thisProject, TypeScriptES6FileParser,
            "lib/project/*.ts",
            "//FunctionDeclaration[//ExportKeyword]//Identifier")
            .then(values => {
                assert(values.length > 5);
                done();
            }).catch(done);
    }).timeout(15000);

});
