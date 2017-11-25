import "mocha";
import * as assert from "power-assert";
import { findMatches, findValues } from "../../../../src/tree/ast/astUtils";
import {
    TypeScriptES6FileParser,
    TypeScriptFileParser,
} from "../../../../src/tree/ast/typescript/TypeScriptFileParser";

import * as appRoot from "app-root-path";
import { NodeFsLocalProject } from "../../../../src/project/local/NodeFsLocalProject";

/**
 * Parse sources in this project
 */
describe("TypeScriptFileParser real project parsing: JavaScript", () => {

    const thisProject = new NodeFsLocalProject("automation-client", appRoot.path, () => Promise.resolve());

    it("should parse sources from project and use a path expression to find values", done => {
        findMatches(thisProject, TypeScriptES6FileParser,
            "build/src/tree/ast/typescript/*.js",
            "//ClassDeclaration/Identifier")
            .then(matchResults => {
                assert.deepEqual(matchResults.map(m => m.$value),
                    ["TypeScriptFileParser", "TypeScriptAstNodeTreeNode"]);
                done();
            }).catch(done);
    }).timeout(5000);

    it("should parse sources from project and use a path expression to find values using convenience method", done => {
        findValues(thisProject, TypeScriptES6FileParser,
            "build/src/tree/ast/typescript/*.js",
            "//ClassDeclaration/Identifier")
            .then(values => {
                assert.deepEqual(values,
                    ["TypeScriptFileParser", "TypeScriptAstNodeTreeNode"]);
                done();
            }).catch(done);
    }).timeout(5000);

    it("should parse sources from project and find functions", done => {
        findValues(thisProject, TypeScriptES6FileParser,
            "build/src/tree/ast/**/*.js",
            "//FunctionDeclaration/Identifier")
            .then(values => {
                assert(values.length > 2);
                done();
            }).catch(done);
    }).timeout(5000);

});
