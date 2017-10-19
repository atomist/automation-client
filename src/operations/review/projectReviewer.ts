import { HandlerContext } from "../../HandlerContext";
import { Project } from "../../project/Project";
import { ProjectReview } from "./ReviewResult";

/**
 * Function that can review projects
 */
export type ProjectReviewer<RR extends ProjectReview = ProjectReview> =
    (p: Project, context: HandlerContext) => Promise<RR>;
