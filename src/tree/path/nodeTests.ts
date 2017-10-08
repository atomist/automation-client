import { TreeNode } from "../TreeNode";
import { NodeTest } from "./pathExpression";

export const AllNodeTest: NodeTest = {

    name: "AllNodes",

    test() {
       return true;
    },

    toString() {
        return "*";
    },
} as NodeTest;

export class NamedNodeTest implements NodeTest {

    constructor(public name: string) {}

    public test(tn: TreeNode) {
        return tn.$name === this.name;
    }

    public toString() {
        return this.name;
    }
}

export function isNamedNodeTest(t: NodeTest): t is NamedNodeTest {
    return !!t && !!(t as NamedNodeTest).name;
}
