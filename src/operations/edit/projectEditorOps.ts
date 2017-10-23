import { actionChainWithCombiner } from "../../action/actionOps";
import { isActionResult } from "../../action/ActionResult";
import { Project } from "../../project/Project";
import { EditResult, flushAndSucceed, ProjectEditor, successfulEdit } from "./projectEditor";

export type ProjectOp = (p: Project) => Promise<Project>;

export type EditorChainable = ProjectEditor | ProjectOp;

function combineEditResults(r1: EditResult, r2: EditResult): EditResult {
    return {
        ...r1, ...r2,
        edited: r1.edited || r2.edited,
    };
}

/**
 * Chain the editors, in the given order
 * @param {ProjectEditor} projectEditors
 * @return {ProjectEditor}
 */
export function chainEditors(
    ...projectEditors: EditorChainable[]): ProjectEditor {
    const alwaysReturnEditResult =
        projectEditors.map(toEditor);

    return (p, ctx, params) => {
        const curried = alwaysReturnEditResult.map(ed => pp => ed(pp, ctx, params));
        const chain = actionChainWithCombiner(combineEditResults,
            ...curried);
        return chain(p) as Promise<EditResult>;
    };
}
function toEditor(pop: EditorChainable): ProjectEditor {
    return (proj, ctx, params) => (pop as ProjectOp)(proj)
        .then(r => {
            // See what it returns
            return isActionResult(r) ?
                r as any as EditResult :
                flushAndSucceed(r);
        });
}

/**
 * Useful starting point for editor chaining
 * @param {Project} p
 * @constructor
 */
export const NoOpEditor: ProjectEditor = p => Promise.resolve(successfulEdit(p, false));
