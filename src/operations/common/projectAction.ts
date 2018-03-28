import { ActionResult } from "../../action/ActionResult";
import { Project } from "../../project/Project";
import { HandlerContext } from "../../HandlerContext";

/**
 * Action on a project, given parameters. Expose HandlerContext
 * to allow communication with user etc.
 */
export type ProjectAction<PARAMS, P extends Project = Project> =
    (p: P, params: PARAMS, ctx: HandlerContext) => Promise<ActionResult<P>>;
