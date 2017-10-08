import { TreeNode } from "../TreeNode";
import { ExpressionEngine } from "./expressionEngine";

/**
 * One of the three core elements of a LocationStep. Borrowed from XPath.
 * Determines the kind of navigation.
 */
export type AxisSpecifier = "self" | "child" | "descendant";

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
     * Follow the given axis specifier to obtain nodes. Test them.
     * @param {TreeNode} tn
     * @param {AxisSpecifier} axis
     * @param {ExpressionEngine} ee
     * @return {SuccessResult}
     */
    follow(tn: TreeNode,
           axis: AxisSpecifier,
           ee: ExpressionEngine): SuccessResult;
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

    public follow(tn: TreeNode, ee: ExpressionEngine): ExecutionResult {
        return  this.test.follow(tn, this.axis, ee);
    }

    public toString() {
        const preds = this.predicates.length > 0 ?
            this.predicates.map(p => `[${p}]`).join("") :
            "";
        return `${this.axis}::${this.test}${preds}`;
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
