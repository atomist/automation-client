
import { TreeNode } from "@atomist/tree-path/TreeNode";
import { FileParser } from "../FileParser";

import { Microgrammar } from "@atomist/microgrammar/Microgrammar";
import { isTreePatternMatch, PatternMatch } from "@atomist/microgrammar/PatternMatch";
import { defineDynamicProperties, fillInEmptyNonTerminalValues } from "@atomist/tree-path/manipulation/enrichment";
import { File } from "../../../project/File";

/**
 * Allow path expressions against results from a single microgrammar
 */
export class MicrogrammarBasedFileParser implements FileParser {

    constructor(public rootName: string,
                public matchName: string,
                public grammar: Microgrammar<any>) {
    }

    public toAst(f: File): Promise<TreeNode> {
        return f.getContent()
            .then(content => {
                const matches = this.grammar.findMatches(content);
                const root = {
                    $name: this.rootName,
                    $children: matches.map(m =>
                        new MicrogrammarBackedTreeNode(this.matchName, m, undefined)),
                };
                defineDynamicProperties(root);
                fillInEmptyNonTerminalValues(root, content);
                return root;
            });
    }
}

/**
 * TreeNode implementation backed by a microgrammar match
 */
class MicrogrammarBackedTreeNode implements TreeNode {

    public readonly $children: TreeNode[];

    public $value: string;

    public readonly $offset: number;

    constructor(public $name: string, m: PatternMatch, public $parent: TreeNode) {
        this.$offset = m.$offset;
        if (isTreePatternMatch(m)) {
            const subs = m.submatches();
            this.$children = Object.getOwnPropertyNames(subs)
                .map(prop => {
                    const sub = subs[prop];
                    // console.log("Exposing child %s.%s as [%s]", $name, prop, JSON.stringify(sub));
                    return new MicrogrammarBackedTreeNode(prop, sub, this);
                });
        } else {
            // console.log("Exposing terminal %s as [%s]: value=[%s]", $name, JSON.stringify(m), m.$matched);
            this.$value = String(m.$value);
        }
    }

}
