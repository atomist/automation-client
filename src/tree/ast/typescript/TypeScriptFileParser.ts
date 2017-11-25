import * as _ from "lodash";

import { TreeNode } from "@atomist/tree-path/TreeNode";
import { FileParser } from "../FileParser";

import { AllNodeTest, isNamedNodeTest } from "@atomist/tree-path/path/nodeTests";
import { isUnionPathExpression, LocationStep, PathExpression, stringify } from "@atomist/tree-path/path/pathExpression";
import * as ts from "typescript";
import { logger } from "../../../internal/util/logger";
import { File } from "../../../project/File";

/**
 * Allow path expressions against ASTs from the TypeScript parser.
 * For reference material on the grammar, and which productions are legal
 * names in path expressions, see the grammar at
 * https://github.com/Microsoft/TypeScript/blob/master/doc/spec.md#A.
 * See also the ES6 grammar of which TypeScript is a superset:
 * http://www.ecma-international.org/ecma-262/6.0/#sec-grammar-summary.
 * and the SyntaxKind type defined by
 * the TypeScript compiler. Invalid production names will be rejected
 * with a runtime error.
 *
 * Will try to determine TypeScript ScriptKind from the file extension.
 */
export class TypeScriptFileParser implements FileParser {

    public rootName = ts.SyntaxKind[ts.SyntaxKind.SourceFile];

    constructor(public scriptTarget: ts.ScriptTarget) {
    }

    public toAst(f: File): Promise<TreeNode> {
        return f.getContent()
            .then(content => {
                const sourceFile = ts.createSourceFile(f.name, content, this.scriptTarget, false, scriptKindFor(f));
                const root = new TypeScriptAstNodeTreeNode(sourceFile, sourceFile, undefined);
                return root;
            });
    }

    /**
     * Check that this path expression uses only valid TypeScript constructs
     * @param {PathExpression} pex
     */
    public validate(pex: PathExpression): void {
        for (const ls of locationSteps(pex)) {
            if (isNamedNodeTest(ls.test) && ls.test !== AllNodeTest) {
                if (!ts.SyntaxKind[ls.test.name]) {
                    throw new Error(`Invalid path expression '${stringify(pex)}': ` +
                        `No such TypeScript element: '${ls.test.name}'`);
                }
            }
        }
    }
}

/**
 * Determine the script kind of the file from its extension
 * @param {File} f
 * @return {ts.ScriptKind}
 */
function scriptKindFor(f: File): ts.ScriptKind {
    switch (f.extension) {
        case "js" :
            return ts.ScriptKind.JS;
        case "jsx" :
            return ts.ScriptKind.JSX;
        case "ts" :
            return ts.ScriptKind.TS;
        case "tsx" :
            return ts.ScriptKind.TSX;
        default:
            return ts.ScriptKind.Unknown;
    }
}

// TODO coming from newer path expression support
function locationSteps(pex: PathExpression): LocationStep[] {
    return isUnionPathExpression(pex) ?
        _.flatten(pex.unions.map(p => locationSteps(p))) :
        pex.locationSteps;
}

/**
 * TreeNode implementation backed by a node from the TypeScript parser
 */
class TypeScriptAstNodeTreeNode implements TreeNode {

    public readonly $children: TreeNode[] = [];

    public readonly $name;

    public readonly $offset: number;

    constructor(private sourceFile: ts.SourceFile, private node: ts.Node, public $parent: TreeNode) {
        this.$name = extractName(node);
        try {
            this.$offset = node.getStart(sourceFile, true);
        } catch (e) {
            // Ignore and continue
            logger.warn("Cannot get start for node with kind %s", ts.SyntaxKind[node.kind]);
        }

        for (const n of node.getChildren(sourceFile)) {
            if (!!n) {
                this.$children.push(new TypeScriptAstNodeTreeNode(sourceFile, n, this));
            }
        }

        if (this.$children.length === 0) {
            // Get it off the JSON if it doesn't matter
            this.$children = undefined;
        } else {
            // It's a non-terminal, so the name needs to be the kind
            this.$name = ts.SyntaxKind[node.kind];
        }
    }

    get $value() {
        return extractValue(this.sourceFile, this.node);
    }

}

function extractName(node: any): string {
    if (!!node.name && node.name.escapedText) {
        return node.name.escapedText;
    } else {
        return ts.SyntaxKind[node.kind];
    }
}

function extractValue(sourceFile: ts.SourceFile, node: any): string {
    if (!!node.text) {
        return node.text;
    }
    try {
        return node.getText(sourceFile);
    } catch (te) {
        const start = node.getStart(sourceFile, true);
        const end = node.getEnd(sourceFile, true);
        if (!!start && !!end) {
            return sourceFile.text.substr(start, end - start);
        }
        return undefined;
    }
}

/**
 * Parser for TypeScript and JavaScript
 * @type {TypeScriptFileParser}
 */
export const TypeScriptES6FileParser = new TypeScriptFileParser(ts.ScriptTarget.ES2016);
