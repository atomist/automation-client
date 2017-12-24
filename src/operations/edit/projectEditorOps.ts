import { actionChainWithCombiner } from "../../action/actionOps";
import { isActionResult } from "../../action/ActionResult";
import { Project } from "../../project/Project";
import {
    AnyProjectEditor, EditResult, flushAndSucceed, ProjectEditor, SimpleProjectEditor,
    successfulEdit,
} from "./projectEditor";

function combineEditResults(r1: EditResult, r2: EditResult): EditResult {
    return {
        ...r1, ...r2,
        edited: (r1.edited || r2.edited) ? true :
            (r1.edited === false && r2.edited === false) ? false : undefined,
    };
}

/**
 * Chain the editors, in the given order
 * @param {ProjectEditor} projectEditors
 * @return {ProjectEditor}
 */
export function chainEditors(...projectEditors: AnyProjectEditor[]): ProjectEditor {
    const alwaysReturnEditResult =
        projectEditors.map(toEditor);

    return (p, ctx, params) => {
        const curried = alwaysReturnEditResult.map(ed => pp => ed(pp, ctx, params));
        const chain = actionChainWithCombiner(combineEditResults,
            ...curried);
        return chain(p) as Promise<EditResult>;
    };
}

function toEditor(pop: AnyProjectEditor): ProjectEditor {
    return (proj, ctx, params) => (pop as SimpleProjectEditor)(proj, ctx, params)
        .then(r => {
            if (!r) {
                const editorName = pop.name || "";
                return Promise.reject(
                    `Invalid return from ${editorName}. Should be EditResult or Project, got: <${r}>`);
            }
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
