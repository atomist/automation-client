
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
        // TODO what about arrays
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
