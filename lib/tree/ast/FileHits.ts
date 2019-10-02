import {
    evaluateExpression,
    isSuccessResult,
    PathExpression,
    TreeNode,
} from "@atomist/tree-path";
import { ExecutionResult } from "@atomist/tree-path/lib/path/pathExpression";
import { ScriptedFlushable } from "../../internal/common/Flushable";
import { File } from "../../project/File";
import {
    Project,
    ProjectAsync,
} from "../../project/Project";
import { logger } from "../../util/logger";
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

    replaceAfter: { after: /\s*/, replacement: "" },
};

/**
 * Extension of TreeNode that allows convenient addition before
 * or after a node, without updating the node's value.
 */
export interface MatchResult extends LocatedTreeNode {

    append(content: string): void;

    prepend(content: string): void;

    /**
     * Delete the match. Same as setting $value to the empty string,
     * but can zap trailing spaces also
     * @param {NodeReplacementOptions} opts
     */
    zap(opts: NodeReplacementOptions): void;

    replace(newContent: string, opts: NodeReplacementOptions): void;

    evaluateExpression(pex: string | PathExpression): ExecutionResult;
}

interface Update extends NodeReplacementOptions {

    initialValue: string;
    currentValue: string;
    offset: number;
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
    constructor(private readonly project: ProjectAsync,
                public file: File,
                public fileNode: TreeNode,
                public readonly nodes: LocatedTreeNode[]) {
        const updates: Update[] = [];

        function doReplace(): Promise<File> {
            return file.getContent()
                .then(content => {
                    // Replace in reverse order so that offsets work
                    let newContent = content;
                    const sorted = updates.sort((a, b) => b.offset - a.offset);
                    for (const u of sorted) {
                        if (u.offset === undefined) {
                            throw new Error(`Cannot update as offset is not set: ${JSON.stringify(u)}`);
                        }
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
        makeUpdatable(this.matches, updates);
        (project as any as ScriptedFlushable<Project>).recordAction(doReplace);
    }
}

function requireOffset(m: MatchResult): void {
    if (m.$offset === undefined) {
        throw new Error("Sorry, you can't update this because I don't know its offset. " + m.$name + "=" + m.$value);
    }
}

function makeUpdatable(matches: MatchResult[], updates: Update[]): void {
    matches.forEach(m => {
        const initialValue = m.$value;
        let currentValue = m.$value;
        try {
            Object.defineProperty(m, "$value", {
                get(): string {
                    return currentValue;
                },
                set(v2: string): void {
                    logger.debug("Updating value from '%s' to '%s' on '%s'", currentValue, v2, m.$name);
                    // TODO allow only one
                    currentValue = v2;
                    requireOffset(m);
                    updates.push({ initialValue, currentValue, offset: m.$offset });
                },
            });
        } catch {
            // Ok
        }
        m.append = (content: string) => {
            requireOffset(m);
            updates.push({ initialValue: "", currentValue: content, offset: m.$offset + currentValue.length });
        };
        m.prepend = (content: string) => {
            requireOffset(m);
            updates.push({ initialValue: "", currentValue: content, offset: m.$offset });
        };
        m.replace = (s: string, opts: NodeReplacementOptions) => {
            requireOffset(m);
            updates.push({ ...opts, initialValue, currentValue: s, offset: m.$offset });
        };
        m.zap = (opts: NodeReplacementOptions) => {
            requireOffset(m);
            updates.push({ ...opts, initialValue, currentValue: "", offset: m.$offset });
        };
        m.evaluateExpression = (pex: PathExpression | string) => {
            const r = evaluateExpression(m, pex);
            if (isSuccessResult(r)) {
                makeUpdatable(r as any, updates);
            }
            return r;
        };
    });
}
