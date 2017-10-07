
/**
 * Core abstraction supporting path expressions.
 * Represents a tree node. Property and function names begin with $
 * to ensure they're out of band if we mix in user data
 */
export interface TreeNode {

    readonly $name: string;

    $children?: TreeNode[];

    /**
     * Value, if this is a terminal node
     */
    $value?: string;

    /** Offset from 0 in the file, if available */
    readonly $offset?: number;

}

export function isTerminal(tn: TreeNode): boolean {
    return tn.$value && !(tn.$children && tn.$children.length > 0);
}

/**
 * Visit the node, returning whether to continue
 * @param {TreeNode} n node to visit
 * @return {boolean} whether to visit the node's children, if any
 */
export type TreeVisitor = (n: TreeNode) => boolean;

/**
 * Visit the given TreeNode and its children
 * @param {TreeNode} tn
 * @param {TreeVisitor} v
 */
export function visit(tn: TreeNode, v: TreeVisitor) {
    if (v(tn)) {
        (tn.$children || []).forEach(n => visit(n, v));
    }
}
