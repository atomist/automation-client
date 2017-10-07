import { TreeNode } from "../TreeNode";
import { AxisSpecifier, NodeTest } from "./pathExpression";

import * as _ from "lodash";

export const AllNodeTest: NodeTest = {

    name: "AllNodes",

    follow(tn: TreeNode, axis: AxisSpecifier) {
        switch (axis) {
            case "child" :
                return tn.$children || [];
            case "descendant" :
                return allDescendants(tn);
            default:
                throw new Error(`Unsupported axis [${axis}]`);
        }
    },

    toString() {
        return "*";
    },
} as NodeTest;

export class NamedNodeTest implements NodeTest {

    constructor(public name: string) {}

    public follow(tn: TreeNode, axis: AxisSpecifier) {
        switch (axis) {
            case "child" :
                return (tn.$children || []).filter(n => n.$name === this.name);
            case "descendant" :
                return allDescendants(tn).filter(n => n.$name === this.name);
            default:
                throw new Error(`Unsupported axis [${axis}]`);
        }
    }

    public toString() {
        return this.name;
    }
}

export function isNamedNodeTest(t: NodeTest): t is NamedNodeTest {
    return !!t && !!(t as NamedNodeTest).name;
}

export function allDescendants(tn: TreeNode): TreeNode[] {
    if (!tn.$children) {
        return [];
    }
    return (tn.$children || []).concat(
        _.flatMap(tn.$children.map(kid => allDescendants(kid))));
}
