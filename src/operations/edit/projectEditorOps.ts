import { isActionResult, ActionResult } from "../../action/ActionResult";
import { Project } from "../../project/Project";
import { EditResult, flushAndSucceed, ProjectEditor, successfulEdit } from "./projectEditor";
import { Chainable, actionChain } from "../../action/actionOps";
import { Parameters } from "../../HandleCommand";
import { HandlerContext } from "../../Handlers";

export type ProjectOp = (p: Project) => Promise<Project>;

export type EditorChainable = ProjectEditor | ProjectOp;

/**
 * Chain the editors, in the given order
 * @param {ProjectEditor} projectEditors
 * @return {ProjectEditor}
 */
export function chainEditors<PARAMS extends Parameters = undefined>(
    ...projectEditors: EditorChainable[]): ProjectEditor {
    const groupParameters: Chainable<[Project, HandlerContext, PARAMS]>[] = projectEditors.map(ed =>
        (all3) => {
            const [project, ctx, params] = all3;
            const result: Promise<EditResult> = (ed as ProjectEditor)(project, ctx, params);
            return result.then(er => {
                const actionResult: ActionResult<[Project, HandlerContext, PARAMS]> = {
                    ...er,
                    target: [er.target, ctx, params]
                } as ActionResult<[Project, HandlerContext, PARAMS]>; // it's OK to have `edited` too.
                return actionResult;
            })
        })
    return (p, ctx, params) => actionChain(...groupParameters)([p, ctx, params]).then(bigResult => {
        return {
            ...bigResult,
            target: bigResult.target[0] // pull out just the project
        } as EditResult
    });

}

/**
 * Useful starting point for editor chaining
 * @param {Project} p
 * @constructor
 */
export const NoOpEditor: ProjectEditor = p => Promise.resolve(successfulEdit(p, false));
