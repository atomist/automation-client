import { TreeNode } from "../TreeNode";
import { ExpressionEngine } from "./expressionEngine";

/**
 * One of the three core elements of a LocationStep. Borrowed from XPath.
 * Determines the kind of navigation.
 */
export interface AxisSpecifier {

    type: string;

    /**
     * Follow the given axis.
     * @param {TreeNode} tn node we're navigating from
     * @param {TreeNode} root root of document. Necessary to handle parent etc.
     * @return {TreeNode[]}
     */
    follow(tn: TreeNode, root: TreeNode): TreeNode[];
}

export type FailureResult = string;

export type SuccessResult = TreeNode[];

/**
 * Result of executing a path expression
 */
export type ExecutionResult = FailureResult | SuccessResult;

export function isSuccessResult(a: any): a is SuccessResult {
    return !!a && !!a.length;
}

/**
 * One of the three core elements of a LocationStep. Inspired by XPath NodeTest.
 */
export interface NodeTest {

    /**
     * Test nodes returned from navigating an AxisSpecifier.
     * @param {TreeNode} tn
     * @param {ExpressionEngine} ee
     * @return {SuccessResult}
     */
    test(tn: TreeNode,
         ee: ExpressionEngine): boolean;
}

/**
 * Based on the XPath concept of a predicate. A predicate acts on a sequence of nodes
 * returned from navigation to filter them.
 */
export interface Predicate {

    /**
     * Function taking nodes returned by navigation
     * to filter them. We test one node with knowledge of all returned nodes.
     *
     * @param nodeToTest    node we're testing on;
     * @param returnedNodes all nodes returned. This argument is
     *                      often ignored, but can be used to discern the index of the target node.
     * @param ee expression engine to evaluateExpression
     */
    evaluate(nodeToTest: TreeNode,
             returnedNodes: TreeNode[],
             ee: ExpressionEngine): boolean;
}

/**
 * Step within a path expression
 */
export class LocationStep {

    constructor(public axis: AxisSpecifier,
                public test: NodeTest,
                public predicates: Predicate[]) {
    }

    public follow(tn: TreeNode, root: TreeNode, ee: ExpressionEngine): ExecutionResult {
        const allNodes = this.axis.follow(tn, root)
            .filter(n => this.test.test(n, ee));
        return allNodes.filter(n =>
            !this.predicates.some(pred => !pred.evaluate(n, allNodes, ee)));
    }

    public toString() {
        const preds = this.predicates.length > 0 ?
            this.predicates.map(p => `[${p}]`).join("") :
            "";
        return `${this.axis.type}::${this.test}${preds}`;
    }

}

/**
 * Result of parsing a path expression.
 */
export interface PathExpression {

    locationSteps: LocationStep[];
}

/**
 * Return an informative string representation of the given path expression
 * @param {PathExpression} pe
 * @return {string}
 */
export function stringify(pe: PathExpression): string {
    return pe.locationSteps.map(l => "" + l).join("/");
}
