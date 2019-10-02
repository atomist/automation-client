import { CFamilyLangHelper } from "@atomist/microgrammar/lib/matchers/lang/cfamily/CFamilyLangHelper";
import {
    evaluateScalar,
    evaluateScalarValue,
    evaluateScalarValues,
    TreeNode,
    TreeVisitor,
    visit,
} from "@atomist/tree-path";
import * as assert from "power-assert";
import { InMemoryFile } from "../../../../lib/project/mem/InMemoryFile";
import { InMemoryProject } from "../../../../lib/project/mem/InMemoryProject";
import { Project } from "../../../../lib/project/Project";
import { matches } from "../../../../lib/tree/ast/astUtils";
import { MatchResult } from "../../../../lib/tree/ast/FileHits";
import { FileParser } from "../../../../lib/tree/ast/FileParser";
import {
    TypeScriptES6FileParser,
    TypeScriptFileParser,
} from "../../../../lib/tree/ast/typescript/TypeScriptFileParser";

describe("TypeScriptFileParser", () => {

    it("should handle ill-formed file");

    it("should parse a file", done => {
        const f = new InMemoryFile("script.ts", "const x = 1;");
        TypeScriptES6FileParser
            .toAst(f)
            .then(root => {
                // console.log(stringify(root, null, 2));
                assert.equal(root.$name, "SourceFile");
                done();
            }).catch(done);
    });

    it("should parse a file and use a path expression to find a node", done => {
        const f = new InMemoryFile("script.ts", "const x = 1;");
        TypeScriptES6FileParser
            .toAst(f)
            .then(root => {
                const value = evaluateScalar(root, "//VariableDeclarationList");
                assert(!!value);
                done();
            }).catch(done);
    });

    it("should reject invalid path expression", done => {
        const f = new InMemoryFile("script.ts", "const x = 1;");
        TypeScriptES6FileParser
            .toAst(f)
            .then(root => {
                try {
                    evaluateScalarValue(root, "//xxVariableDeclaration/Identifier");
                    assert.fail("Should have rejected invalid path expression");
                } catch (e) {
                    // Ok
                    done();
                }
            }).catch(done);
    });

    it("should parse a file and use a path expression to find a value", done => {
        const f = new InMemoryFile("script.ts", "const x = 1;");
        TypeScriptES6FileParser
            .toAst(f)
            .then(root => {
                const value = evaluateScalarValue(root, "//VariableDeclaration/Identifier");
                assert.equal(value, "x");
                done();
            }).catch(done);
    });

    it("should parse a file and use a path expression to find values", done => {
        const f = new InMemoryFile("script.ts", "const x = 1; let y = 2;");
        TypeScriptES6FileParser
            .toAst(f)
            .then(root => {
                const values = evaluateScalarValues(root, "//Identifier");
                assert.deepEqual(values, ["x", "y"]);
                done();
            }).catch(done);
    });

    it("should parse a file and keep positions", done => {
        const f = new InMemoryFile("script.ts", "const x = 1; let y = 2;");
        TypeScriptES6FileParser
            .toAst(f)
            .then(root => {
                assert.equal(root.$name, "SourceFile");
                let minOffset = -1;
                let terminalCount = 0;
                const v: TreeVisitor = tn => {
                    if (tn.$name !== "people") {
                        assert(tn.$offset !== undefined, `No offset on node with name ${tn.$name}`);
                        assert(tn.$offset >= minOffset, `Must have position for node with name ${tn.$name}`);
                        if (!!tn.$value) {
                            ++terminalCount;
                            // It's a terminal
                            const expected = f.getContentSync().substr(tn.$offset, tn.$value.length);
                            const actual = tn.$value;
                            assert.equal(actual, expected,
                                `Unable to validate content for node with name ${tn.$name}: ` +
                                `[${actual}] and [${expected}]`);
                        }
                        minOffset = tn.$offset;
                    }
                    return true;
                };
                visit(root, v);
                assert(terminalCount > 0);
                done();
            }).catch(done);
    });

    it("should parse project and use a path expression to find a value", async () => {
        const p = InMemoryProject.of({ path: "script.ts", content: "const x = 1;" });
        const matchResults = await matches(p, {
            parseWith: TypeScriptES6FileParser,
            globPatterns: "**/*.ts",
            pathExpression: "//VariableDeclaration/Identifier",
        });
        // console.log(stringify(root, null, 2));
        assert.equal(matchResults.length, 1);
        assert(matchResults[0].$value === "x");
    });

    it("should parse project and use a path expression to find and update a value", async () => {
        const p = InMemoryProject.of({ path: "script.ts", content: "const x = 1;" });
        const matchResults = await matches(p, {
            parseWith: TypeScriptES6FileParser,
            globPatterns: "**/*.ts",
            pathExpression: "//VariableDeclaration/Identifier",
        });
        // console.log(stringify(root, null, 2));
        assert(matchResults.length === 1);
        assert(matchResults[0].$value === "x");
        matchResults[0].$value = "y";
        await p.flush();
        const f = p.findFileSync("script.ts");
        assert(f.getContentSync() === "const y = 1;");
    });

    it("should parse project and use a path expression to find and update a value in an inner search", async () => {
        const p = InMemoryProject.of({ path: "script.ts", content: "const x = 1;" });
        const outer = await matches(p, {
            parseWith: TypeScriptES6FileParser,
            globPatterns: "**/*.ts",
            pathExpression: "//VariableDeclaration",
        });
        const matchResults = outer[0].evaluateExpression("//Identifier") as TreeNode[];
        // console.log(stringify(root, null, 2));
        assert(matchResults.length === 1);
        assert(matchResults[0].$value === "x");
        matchResults[0].$value = "y";
        await p.flush();
        const f = p.findFileSync("script.ts");
        assert(f.getContentSync() === "const y = 1;");
    });

    it("shas functions", async () => {
        const p = InMemoryProject.of({
            path: "script.js",
            content:
                "function it(a, b) { // get rid of this \nreturn \n 'frogs'; }",
        });
        const functions = await getFunctionSignatures(p);

        // console.log(stringify(root, null, 2));
        assert(functions.length === 1);
        assert.equal(functions[0].identifier, "it");
        assert.equal(functions[0].canonicalBody,
            "function it(a, b){return 'frogs';}");
        assert.equal(functions[0].path,
            "script.js");
    });

});

export interface SignatureRequest {
    /**
     * Parser to use to parse the content
     */
    fileParser: FileParser;

    /**
     * Path expression for the elements we want
     */
    pathExpression: string;

    /**
     * Glob patterns for the files we want to parse
     */
    globPattern: string;

    /**
     * Function to extract the identifier from each matched element
     * @param {MatchResult} m
     * @return {string}
     */
    extractIdentifier: (m: MatchResult) => string;
}

const JavaScriptFunctionSignatureRequest: SignatureRequest = {
    fileParser: TypeScriptES6FileParser,
    pathExpression: "//FunctionDeclaration",
    globPattern: "**/*.js",
    extractIdentifier: m => {
        const ids = m.evaluateExpression("//Identifier") as TreeNode[];
        return ids[0].$value;
    },
};

async function getFunctionSignatures(p: Project,
                                     opts: Partial<SignatureRequest> = {}): Promise<Signature[]> {
    const optsToUse: SignatureRequest = {
        ...JavaScriptFunctionSignatureRequest,
        ...opts,
    };
    const ms = await matches(p, {
        parseWith: optsToUse.fileParser,
        globPatterns: optsToUse.globPattern,
        pathExpression: optsToUse.pathExpression,
    });
    const helper = new CFamilyLangHelper();
    return ms.map(m => {
        const identifier = optsToUse.extractIdentifier(m);
        const body = m.$value;
        return {
            path: m.sourceLocation.path,
            identifier,
            body,
            canonicalBody: helper.canonicalize(body),
        };
    });
}

/**
 * Function signature we've found
 */
interface Signature {

    /**
     * Path of the file within the project
     */
    path: string;

    /**
     * Identifier of the element
     */
    identifier: string;

    body: string;

    canonicalBody: string;
}
