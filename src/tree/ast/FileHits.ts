import { logger } from "../../internal/util/logger";

import { TreeNode } from "@atomist/tree-path/TreeNode";
import { File } from "../../project/File";
import { ProjectAsync } from "../../project/Project";
import { LocatedTreeNode } from "../LocatedTreeNode";

/**
 * Options for handling production replacements
 */
export interface NodeReplacementOptions {

    replaceAfter?: { after: RegExp, replacement: string };
}

/**
 * Replacement option to zap trailing whitespace
 * @type {{replaceAfter: {after: RegExp; replacement: string}}}
 */
export const ZapTrailingWhitespace: NodeReplacementOptions = {

    replaceAfter: {after: /\s*/, replacement: ""},
};

/**
 * Extension of TreeNode that allows convenient addition before
 * or after a node, without updating the node's value.
 */
export interface MatchResult extends LocatedTreeNode {

    append(content: string);

    prepend(content: string);

    /**
     * Delete the match. Same as setting $value to the empty string,
     * but can zap trailing spaces also
     * @param {NodeReplacementOptions} opts
     */
    zap(opts: NodeReplacementOptions);

    replace(newContent: string, opts: NodeReplacementOptions);
}

/**
 * Represents a file and the hits against it
 */
export class FileHit {

    public readonly matches: MatchResult[];

    /**
     * Represents the hits within a file within a project
     * @param project
     * @param {File} file file within the project
     * @param {TreeNode} fileNode node structure including AST, so
     * that if we want to dig into it or run further path expressions
     * we don't need to reparse the file.
     * @param {TreeNode[]} nodes
     */
    constructor(private project: ProjectAsync,
                public file: File,
                public fileNode: TreeNode,
                public readonly nodes: LocatedTreeNode[]) {

        interface Update extends NodeReplacementOptions {
            initialValue: string;
            currentValue: string;
            offset: number;
        }

        const updates: Update[] = [];

        function doReplace(): Promise<File> {
            return file.getContent()
                .then(content => {
                    // Replace in reverse order so that offsets work
                    let newContent = content;
                    const sorted = updates.sort((a, b) => b.offset - a.offset);
                    for (const u of sorted) {
                        logger.debug("Applying update %j", u);
                        if (!!u.replaceAfter) {
                            newContent = newContent.substr(0, u.offset) +
                                newContent.substr(u.offset).replace(u.initialValue, u.currentValue);
                            newContent = newContent.substr(0, u.offset + u.currentValue.length) +
                                newContent.substr(u.offset + u.currentValue.length).replace(u.replaceAfter.after, u.replaceAfter.replacement);
                        } else {
                            newContent = newContent.substr(0, u.offset) +
                                newContent.substr(u.offset).replace(u.initialValue, u.currentValue);
                        }
                    }
                    return file.setContent(newContent);
                });
        }

        this.matches = nodes as MatchResult[];

        // Define a "value" property on each match that causes the project to be updated
        this.matches.forEach(m => {
            const initialValue = m.$value;
            let currentValue = m.$value;
            Object.defineProperty(m, "$value", {
                get() {
                    return currentValue;
                },
                set(v2) {
                    logger.info("Updating value from '%s' to '%s' on '%s'", currentValue, v2, m.$name);
                    // TODO allow only one
                    currentValue = v2;
                    updates.push({initialValue, currentValue, offset: m.$offset});
                },
            });
            m.append = (content: string) => {
                updates.push({initialValue: "", currentValue: content, offset: m.$offset + currentValue.length});
            };
            m.prepend = (content: string) => {
                updates.push({initialValue: "", currentValue: content, offset: m.$offset});
            };
            m.zap = (opts: NodeReplacementOptions) => {
                updates.push({...opts, initialValue, currentValue: "", offset: m.$offset});
            };
        });
        project.recordAction(p => doReplace());
    }
}
