import { TreeNode } from "@atomist/tree-path/TreeNode";
import { FileParser } from "../FileParser";

import { File } from "../../../project/File";

import { curry } from "@typed/curry";
import * as ts from "typescript";

/**
 * Allow path expressions against results from a single microgrammar
 */
export class TypeScriptFileParser implements FileParser {

    public rootName = ts.SyntaxKind[ts.SyntaxKind.SourceFile];

    constructor(public scriptTarget: ts.ScriptTarget = ts.ScriptTarget.ES2016,
                public scriptKind: ts.ScriptKind = ts.ScriptKind.TS) {
    }

    public toAst(f: File): Promise<TreeNode> {
        return f.getContent()
            .then(content => {
                const sourceFile = ts.createSourceFile(f.name, content, this.scriptTarget, false, this.scriptKind);
                const root = new TypeScriptAstNodeTreeNode(sourceFile, sourceFile);
                //defineDynamicProperties(root);
                //fillInEmptyNonTerminalValues(root, content);
                return root;
            });
    }
}

/**
 * TreeNode implementation backed by a microgrammar match
 */
class TypeScriptAstNodeTreeNode implements TreeNode {

    public readonly $children: TreeNode[] = [];

    public readonly $name;

    public $value: string;

    public readonly $offset: number;

    constructor(sourceFile: ts.SourceFile, node: ts.Node) {
        //console.log(JSON.stringify(node, null, 2));
        this.$name = extractName(node);
        this.$offset = node.getStart(sourceFile, true);

        function visit(children: TreeNode[], n: ts.Node) {
            if (!!n) {
                children.push(new TypeScriptAstNodeTreeNode(sourceFile, n));
            }
        }

        ts.forEachChild(node, curry(visit)(this.$children));

        if (this.$children.length === 0) {
            // Get it off the JSON if it doesn't matter
            this.$children = undefined;
        }
        this.$value = extractValue(sourceFile, node);
    }

}

function extractName(node: any): string {
    if ((node as any).name) {
        // TODO this looks fragile
        return (node as any).name.escapedText;
    } else {
        return ts.SyntaxKind[node.kind];
    }
}

function extractValue(sourceFile: ts.SourceFile, node: any): string {
    if ((node.text)) {
        return node.text;
    }
    try {
        return node.getText(sourceFile);
    } catch (te) {
        return undefined;
    }
}
