import { logger } from "../../internal/util/logger";
import { Project } from "../../project/Project";
import { AnyProjectEditor, EditResult, ProjectEditor, successfulEdit, toEditor } from "./projectEditor";

/**
 * Chain the editors, in the given order
 * @param {ProjectEditor} projectEditors
 * @return {ProjectEditor}
 */
export function chainEditors(...projectEditors: AnyProjectEditor[]): ProjectEditor {
    const asProjectEditors = projectEditors.map(toEditor);
    return async (p, ctx, params) => {
        try {
            let cumulativeResult: EditResult = {
                target: p,
                success: true,
                edited: false,
            };
            for (const pe of asProjectEditors) {
                const lastResult = await pe(p, ctx, params);
                cumulativeResult = combineEditResults(lastResult, cumulativeResult);
            }
            return cumulativeResult;
        } catch (error) {
            logger.warn("Editor failure in editorChain: %s", error);
            return {target: p, edited: false, success: false, error};
        }
    };
}

export function combineEditResults(r1: EditResult, r2: EditResult): EditResult {
    return {
        ...r1,
        ...r2,
        edited: (r1.edited || r2.edited) ? true :
            (r1.edited === false && r2.edited === false) ? false : undefined,
        success: r1.success && r2.success,
    };
}

/**
 * Useful starting point for editor chaining
 * @param {Project} p
 * @constructor
 */
export const NoOpEditor: ProjectEditor = p => Promise.resolve(successfulEdit(p, false));
