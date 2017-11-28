import { ActionResult } from "../../action/ActionResult";
import { Project } from "../../project/Project";

/**
 * Action on a project, given parameters
 */
export type ProjectAction<PARAMS, P extends Project> =
    (p: P, params: PARAMS) => Promise<ActionResult<P>>;
