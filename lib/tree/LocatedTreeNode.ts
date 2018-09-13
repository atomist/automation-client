import { TreeNode } from "@atomist/tree-path";
import { SourceLocation } from "../operations/common/SourceLocation";

/**
 * Extends TreeNode to include a source location within a project.
 */
export interface LocatedTreeNode extends TreeNode {

    sourceLocation: SourceLocation;

}
