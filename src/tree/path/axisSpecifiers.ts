import * as _ from "lodash";

import { TreeNode } from "../TreeNode";
import { AxisSpecifier } from "./pathExpression";

export const ChildAxisSpecifier: AxisSpecifier = {

    type: "child",

    follow(tn: TreeNode) {
        return tn.$children || [];
    },
};

export const DescendantAxisSpecifier: AxisSpecifier = {

    type: "descendant",

    follow(tn: TreeNode) {
        return allDescendants(tn);
    },
};

export const DescendantOrSelfAxisSpecifier: AxisSpecifier = {

    type: "descendant-or-self",

    follow(tn: TreeNode) {
        return allDescendants(tn).concat(tn);
    },
};

export const SelfAxisSpecifier: AxisSpecifier = {

    type: "self",

    follow(tn: TreeNode) {
        return [tn];
    },
};

export function allDescendants(tn: TreeNode): TreeNode[] {
    if (!tn.$children) {
        return [];
    }
    return (tn.$children || []).concat(
        _.flatMap(tn.$children.map(kid => allDescendants(kid))));
}
