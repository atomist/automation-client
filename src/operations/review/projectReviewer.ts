import { HandlerContext } from "../../HandlerContext";
import { Project } from "../../project/Project";
import { ProjectReview } from "./ReviewResult";

/**
 * Function that can review projects
 */
export type ProjectReviewer<P = undefined, PR extends ProjectReview = ProjectReview> =
    (p: Project, context: HandlerContext, params: P) => Promise<PR>;
