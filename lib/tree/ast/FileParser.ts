import {
    PathExpression,
    TreeNode,
} from "@atomist/tree-path";
import { File } from "../../project/File";

/**
 * Central interface for integration of trees and path expressions into the Atomist Project API.
 * Implemented by objects that can parse a file into an AST using a single grammar
 */
export interface FileParser<TN extends TreeNode = TreeNode> {

    /**
     * Name of the top level production: name of the root TreeNode
     */
    rootName: string;

    /**
     * Parse a file, returning an AST
     * @param {File} f
     * @return {TN} root tree node
     */
    toAst(f: File): Promise<TN>;

    /**
     * If this method is supplied, it can help with optimization.
     * If we can look at the path expression and determine a match is impossible
     * in this file, we may be able to skip an expensive parsing operation.
     * @param {File} f
     * @param {PathExpression} pex
     * @return {Promise<boolean>}
     */
    couldBeMatchesInThisFile?(pex: PathExpression, f: File): Promise<boolean>;

    /**
     * Can this path expression possibly be valid using this parser?
     * For example, if the implementation is backed by the grammar for a programming
     * language, the set of symbols is known in advance, as is the legality of their
     * combination.
     * If it is invalid, throw an Error.
     * This is useful to differentiate between nonsensical path expressions and
     * path expressions that didn't match anything.
     * If this function is not implemented, no path expressions will be rejected
     * @param {PathExpression} pex
     */
    validate?(pex: PathExpression): void;
}

export function isFileParser(a: any): a is FileParser {
    return !!a && !!a.toAst;
}
