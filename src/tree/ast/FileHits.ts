import { logger } from "../../internal/util/logger";

import { TreeNode } from "@atomist/tree-path/TreeNode";
import { File } from "../../project/File";
import { ProjectAsync } from "../../project/Project";

/**
 * Extension of TreeNode that allows convenient addition before
 * or after a node, without updating the node's value.
 */
export interface MatchResult extends TreeNode {

    append(content: string);

    prepend(content: string);
}

/**
 * Represents a file and the hits against it
 */
export class FileHit {

    public readonly matches: MatchResult[];

    /**
     * Represents the hits within a file within a project
     * @param {ProjectScripting} project
     * @param {File} file file within the project
     * @param {TreeNode} fileNode node structure including AST, so
     * that if we want to dig into it or run further path expressions
     * we don't need to reparse the file.
     * @param {TreeNode[]} nodes
     */
    constructor(private project: ProjectAsync,
                public file: File,
                public fileNode: TreeNode,
                public readonly nodes: TreeNode[]) {
        interface Update {
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
                    updates.sort(u => -u.offset);
                    for (const u of updates) {
                        logger.debug("Applying update " + JSON.stringify(u));
                        newContent = newContent.substr(0, u.offset) +
                            newContent.substr(u.offset).replace(u.initialValue, u.currentValue);
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
                    logger.info("Updating value from [%s] to [%s] on [%s]", currentValue, v2, m.$name);
                    // TODO allow only one
                    currentValue = v2;
                    updates.push({initialValue, currentValue, offset: m.$offset});
                },
            });
            m.append = (content: string) => {
                updates.push({ initialValue: "", currentValue: content, offset: m.$offset + currentValue.length });
            };
            m.prepend = (content: string) => {
                updates.push({ initialValue: "", currentValue: content, offset: m.$offset });
            };
        });
        project.recordAction(p => doReplace());
    }
}
