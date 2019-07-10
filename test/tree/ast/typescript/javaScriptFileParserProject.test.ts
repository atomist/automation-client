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
describe("TypeScriptFileParser real project parsing: JavaScript", () => {

    const thisProject = new NodeFsLocalProject("automation-client", appRoot.path, () => Promise.resolve());

    it("should parse sources from project and use a path expression to find values", done => {
        findMatches(thisProject, TypeScriptES6FileParser,
            "lib/tree/ast/typescript/*.js",
            "//ClassDeclaration/Identifier")
            .then(matchResults => {
                assert(matchResults.map(m => m.$value).includes(TypeScriptFileParser.name));
                done();
            }).catch(done);
    }).timeout(5000);

    it("should parse sources from project and use a path expression to find values using convenience method", done => {
        findValues(thisProject, TypeScriptES6FileParser,
            "lib/tree/ast/typescript/*.js",
            "//ClassDeclaration/Identifier")
            .then(values => {
                assert(values.includes(TypeScriptFileParser.name));
                done();
            }).catch(done);
    }).timeout(5000);

    it("should parse sources from project and find functions", done => {
        findValues(thisProject, TypeScriptES6FileParser,
            "lib/tree/ast/**/*.js",
            "//FunctionDeclaration/Identifier")
            .then(values => {
                assert(values.length > 2);
                done();
            }).catch(done);
    }).timeout(5000);

});
