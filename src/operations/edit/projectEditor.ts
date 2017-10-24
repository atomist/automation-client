import { ActionResult } from "../../action/ActionResult";
import { HandlerContext } from "../../HandlerContext";
import { Project } from "../../project/Project";

/**
 * Modifies the given project, returning information about the modification.
 * @param p project to edit
 * @param context context for the current command or event handler
 * @param params params, if available
 */
export type ProjectEditor<P = undefined, ER extends EditResult = EditResult> =
    (p: Project, context: HandlerContext, params?: P) => Promise<ER>;

/**
 * Result of editing a project. More information may be added by instances.
 */
export interface EditResult<P extends Project = Project> extends ActionResult<P> {

    /**
     * Whether or not this project was edited
     */
    readonly edited: boolean;
}

/**
 * Turn the given transformation into a ProjectEditor
 * @param {(p: Project, context: HandlerContext, params?: P) => Promise<Project>} trans
 * @return {ProjectEditor<P>}
 */
export function toEditor<P = undefined>(
                        trans: (p: Project, context: HandlerContext, params?: P) =>
                            Promise<Project>): ProjectEditor<P> {
    return (p, context, params) =>
        trans(p, context, params).then(successfulEdit);
}

export function successfulEdit<P extends Project>(p: P, edited: boolean = true): EditResult<P> {
    return {
        target: p,
        success: true,
        edited,
    };
}

export function flushAndSucceed<P extends Project>(p: P): Promise<EditResult<P>> {
    return p.flush().then(successfulEdit);
}
