import { Microgrammar } from "@atomist/microgrammar";
import {
    isTreePatternMatch,
    PatternMatch,
} from "@atomist/microgrammar/lib/PatternMatch";
import {
    defineDynamicProperties,
    fillInEmptyNonTerminalValues,
    TreeNode,
} from "@atomist/tree-path";

import { File } from "../../../project/File";
import { FileParser } from "../FileParser";

/**
 * Allow path expressions against results from a single microgrammar
 */
export class MicrogrammarBasedFileParser implements FileParser {

    constructor(public readonly rootName: string,
                public readonly matchName: string,
                public readonly grammar: Microgrammar<any>) {
    }

    public async toAst(f: File): Promise<TreeNode> {
        const content = await f.getContent();
        const matches = this.grammar.findMatches(content);
        const root = {
            $name: this.rootName,
            $children: matches.map(m =>
                new MicrogrammarBackedTreeNode(this.matchName, m, undefined)),
        };
        defineDynamicProperties(root);
        fillInEmptyNonTerminalValues(root, content);
        return root;
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
        // Copy properties from the match
        Object.getOwnPropertyNames(m)
            .filter(prop => !prop.startsWith("$"))
            .forEach(prop => {
                this[prop] = m[prop];
            });
        if (isTreePatternMatch(m)) {
            const subs = m.submatches();
            this.$children = Object.getOwnPropertyNames(subs)
                .map(prop => {
                    const sub = subs[prop];
                    // console.log("Exposing child %s.%s as [%s]", $name, prop, stringify(sub));
                    return new MicrogrammarBackedTreeNode(prop, sub, this);
                });
        } else {
            // console.log("Exposing terminal %s as [%s]: value=[%s]", $name, stringify(m), m.$matched);
            this.$value = String(m.$value);
        }
    }

}
