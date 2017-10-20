import { isActionResult } from "../../action/ActionResult";
import { Project } from "../../project/Project";
import { EditResult, flushAndSucceed, ProjectEditor, successfulEdit } from "./projectEditor";

export type ProjectOp = (p: Project) => Promise<Project>;

export type Chainable = ProjectEditor | ProjectOp;

/**
 * Chain the editors, in the given order
 * @param {ProjectEditor} projectEditors
 * @return {ProjectEditor}
 */
export function chainEditors(...projectEditors: Chainable[]): ProjectEditor {
    return projectEditors.length === 0 ?
        NoOpEditor :
        projectEditors.reduce((c1, c2) => {
            const ed1: ProjectEditor = toEditor(c1);
            const ed2: ProjectEditor = toEditor(c2);
            return (p, ctx, params) =>
                (ed1(p, ctx, params)
                    .then(r1 => {
                        // console.log("Applied editor " + c1.toString());
                        return ed2(p, ctx, params)
                            .then(r2 => {
                                // console.log("Applied editor " + c2.toString());
                                return {
                                    ...r1,
                                    ...r2,
                                    edited: r1.edited || r2.edited,
                                };
                            });
                    }));
        }) as ProjectEditor;
}

function toEditor(pop: Chainable): ProjectEditor {
    return pop.length === 1 ?
        (proj, ctx, params) => (pop as ProjectOp)(proj)
            .then(r => {
                // See what it returns
                return isActionResult(r) ?
                    r as any as EditResult :
                    flushAndSucceed(r);
            }) :
        pop as ProjectEditor;
}

/**
 * Useful starting point for editor chaining
 * @param {Project} p
 * @constructor
 */
export const NoOpEditor: ProjectEditor = p => Promise.resolve(successfulEdit(p, false));
