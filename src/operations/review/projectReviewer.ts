import { HandlerContext } from "../../HandlerContext";
import { Project } from "../../project/Project";
import { ProjectReview } from "./ReviewResult";

/**
 * Function that can review projects.
 * @param p project to review
 * @param context context for the current command or event handler
 * @param params params, if available
 */
export type ProjectReviewer<P = undefined, PR extends ProjectReview = ProjectReview> =
    (p: Project, context: HandlerContext, params?: P) => Promise<PR>;
