import {
    defineDynamicProperties,
    fillInEmptyNonTerminalValues,
    TreeNode,
} from "@atomist/tree-path";

import { File } from "../../../project/File";
import { FileParser } from "../FileParser";

/**
 * Parameters to RegexFileParser
 */
export interface RegexOptions {

    /**
     * Name of the root element within a document
     */
    readonly rootName: string;

    /**
     * Path element name for each match
     */
    readonly matchName: string;

    /**
     * Regex. May contain capture groups: If so name them with captureGroupNames.
     */
    readonly regex: RegExp;

    /**
     * Names of the capture groups, if any. This is used to populate the tree structure.
     */
    readonly captureGroupNames?: string[];
}

/**
 * Allow path expressions against results from a regex with capture groups
 */
export class RegexFileParser implements FileParser {

    constructor(public readonly opts: RegexOptions) {
    }

    get rootName(): string {
        return this.opts.rootName;
    }

    public async toAst(f: File): Promise<TreeNode> {
        const content = await f.getContent();
        const matches: RegExpExecArray[] = [];
        let remaining = content;
        do {
            const m = this.opts.regex.exec(remaining);
            if (!!m) {
                matches.push(m);
                // Rewrite index in outer string
                m.index += content.length - remaining.length;
                remaining = content.substr(m.index + m[0].length);
            } else {
                break;
            }
        } while (true);
        const root: TreeNode = {
            $name: this.opts.rootName,
        };
        root.$children = matches.map(match => new RegexTreeNode(this.opts, match, root));

        defineDynamicProperties(root);
        fillInEmptyNonTerminalValues(root, content);
        return root;
    }
}

class RegexTreeNode implements TreeNode {

    public readonly $children: TreeNode[];

    public readonly $name: string;

    public readonly $value: string;

    public readonly $offset: number;

    constructor(reo: RegexOptions, m: RegExpExecArray, public $parent: TreeNode) {
        this.$name = reo.matchName;
        this.$offset = m.index;
        this.$value = m[0];
        this.$children = !!reo.captureGroupNames ?
            reo.captureGroupNames.map(($name, i) => {
                const tn: any = {
                    $name,
                    $value: m[i + 1],
                };
                tn.$offset = m.index + m[0].indexOf(tn.$value);
                return tn;
            }) :
            undefined;
    }

}
