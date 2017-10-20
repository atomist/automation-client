import { isActionResult, ActionResult } from "../../action/ActionResult";
import { Project } from "../../project/Project";
import { EditResult, flushAndSucceed, ProjectEditor, successfulEdit } from "./projectEditor";
import { Chainable, actionChain, actionChainWithCombiner, TAction } from "../../action/actionOps";
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
    const editorsWithSameOutputAsInput: Chainable<All3<PARAMS>>[] =
        projectEditors.map(toEditor).map(ed => passAlongExtraArguments<All3<PARAMS>>(ed));

    const chain: TAction<All3<PARAMS>> = actionChainWithCombiner<All3<PARAMS>, EditResultWithAll3<PARAMS>>(
        combineEditResults,
        ...editorsWithSameOutputAsInput)

    return (p, ctx, params) => chain([p, ctx, params]).then(bigResult => {
        return {
            ...bigResult,
            target: bigResult.target[0] // pull out just the project
        } as EditResult
    });
}

function passAlongExtraArguments<All extends Array<any>>(ed /* Receives more args than it returns */): TAction<All> {
    return (all: All) => {
        const result = (ed as any)(...all);
        return result.then(er => {
            all[0] = er.target; /* only the first argument has been updated */
            return {
                ...er,
                target: all
            };
        })
    }
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
