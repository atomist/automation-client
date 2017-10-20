import { isActionResult, ActionResult } from "../../action/ActionResult";
import { Project } from "../../project/Project";
import { EditResult, flushAndSucceed, ProjectEditor, successfulEdit } from "./projectEditor";
import { Chainable, actionChain, actionChainWithCombiner } from "../../action/actionOps";
import { Parameters } from "../../HandleCommand";
import { HandlerContext } from "../../Handlers";

export type ProjectOp = (p: Project) => Promise<Project>;

export type EditorChainable = ProjectEditor | ProjectOp;


type All3<PARAMS> = [Project, HandlerContext, PARAMS]
interface EditResultWithAll3<PARAMS> extends ActionResult<All3<PARAMS>> {
    edited: boolean
}
function combineEditResults<PARAMS>(r1: EditResultWithAll3<PARAMS>, r2: EditResultWithAll3<PARAMS>): EditResultWithAll3<PARAMS> {
    return {
        ...r1, ...r2,
        edited: r1.edited || r2.edited
    }
}

/**
 * Chain the editors, in the given order
 * @param {ProjectEditor} projectEditors
 * @return {ProjectEditor}
 */
export function chainEditors<PARAMS extends Parameters = undefined>(
    ...projectEditors: EditorChainable[]): ProjectEditor {
    const groupParameters: Chainable<All3<PARAMS>>[] = projectEditors.map(toEditor).map(ed =>
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
    return (p, ctx, params) => actionChainWithCombiner<All3<PARAMS>, EditResultWithAll3<PARAMS>>(
        combineEditResults,
        ...groupParameters)([p, ctx, params]).then(bigResult => {
            return {
                ...bigResult,
                target: bigResult.target[0] // pull out just the project
            } as EditResult
        });
}

function toEditor(pop: EditorChainable): ProjectEditor {
    return (proj, ctx, params) => (pop as ProjectOp)(proj)
        .then(r => {
            // See what it returns
            return isActionResult(r) ?
                r as any as EditResult :
                flushAndSucceed(r);
        })
}

/**
 * Useful starting point for editor chaining
 * @param {Project} p
 * @constructor
 */
export const NoOpEditor: ProjectEditor = p => Promise.resolve(successfulEdit(p, false));
