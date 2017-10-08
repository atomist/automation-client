import * as _ from "lodash";

import { logger } from "../internal/util/logger";
import { isTerminal, TreeNode, TreeVisitor, visit } from "./TreeNode";

/**
 * Define properties allowing navigation down the tree.
 * Terminal properties have their value directly exposed.
 * There are 2 properties for non-terminals: scalar, and array with a following "s"
 * @param {TreeNode} root
 */
export function defineDynamicProperties(root: TreeNode): void {
    const propertyAdder: TreeVisitor = (n: TreeNode) => {
        (n.$children || []).forEach(kid => {
            addChildProperty(n, kid.$name, kid) ;
        });
        return true;
    };
    visit(root, propertyAdder);
}

function addChildProperty(n: TreeNode, key: string, value: TreeNode): void {
    const valueToUse = isTerminal(value) ? value.$value : value;
    if (!n[pluralName(key)]) {
        n[pluralName(key)] = [];
    }
    n[pluralName(key)].push(valueToUse);
    logger.debug("Adding property %s to node name %s", key, n.$name);
    if (!n[key]) {
        Object.defineProperty(n, key, {
            get() {
                return valueToUse;
            },
        });
    }
}

function pluralName(key: string): string {
    return key + "s";
}

/**
 * Fill in the values of non-terminals in this tree, using the last terminal found underneath it
 * @param {TreeNode} root
 * @param {string} content
 */
export function fillInEmptyNonTerminalValues(root: TreeNode, content: string): void {
    const valueFiller: TreeVisitor = (n: TreeNode) => {
        if (!n.$value && n.$children) {
            const lt = lastTerminal(n);
            if (lt) {
                const lastIndex = lt.$offset + lt.$value.length;
                const value = content.substr(n.$offset, lastIndex - n.$offset);
                // console.log(`Setting value on ${n.$name} to [${value}]`);
                n.$value = value;
            }
        }
        return true;
    };
    visit(root, valueFiller);
}

/**
 * Find the last terminal under this node
 * @param {TreeNode} tn
 * @return {TreeNode}
 */
export function lastTerminal(tn: TreeNode): TreeNode | undefined {
    if (!tn.$children || tn.$children.length === 0) {
        return undefined;
    }
    const last = _.last(tn.$children);
    return isTerminal(last) ?
        last :
        lastTerminal(last);
}
