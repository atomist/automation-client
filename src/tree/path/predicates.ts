
import { TreeNode } from "../TreeNode";
import { ExpressionEngine } from "./expressionEngine";
import { PathExpression, Predicate, stringify } from "./pathExpression";

export class ValuePredicate implements Predicate {

    constructor(public $value: string) {}

    public evaluate(nodeToTest: TreeNode, returnedNodes: TreeNode[]): boolean {
        return nodeToTest.$value === this.$value;
    }

    public toString() {
        return `@value='${this.$value}'`;
    }
}

export class NestedPathExpressionPredicate implements Predicate {

    constructor(public pathExpression: PathExpression) {}

    public evaluate(nodeToTest: TreeNode, returnedNodes: TreeNode[],  ee: ExpressionEngine): boolean {
        throw new Error("not yet implemented");
    }

    public toString() {
        return stringify(this.pathExpression);
    }
}
