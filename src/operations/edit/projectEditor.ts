import { HandlerContext } from "../../HandlerContext";
import { ActionResult } from "../../internal/util/ActionResult";
import { Project } from "../../project/Project";

/**
 * Modifies the given project, returning information about the modification.
 */
export type ProjectEditor<ER extends EditResult = EditResult> =
    (p: Project, context: HandlerContext) => Promise<ER>;

/**
 * Result of editing a project. More information may be added by instances.
 */
export interface EditResult<P extends Project = Project> extends ActionResult<P> {

    /**
     * Whether or not this project was edited
     */
    readonly edited: boolean;
}

export function successfulEdit<P extends Project>(p: P, edited: boolean = true): EditResult<P> {
    return {
        target: p,
        success: true,
        edited,
    };
}
