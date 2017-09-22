import { Project } from "../../project/Project";
import { RepoId } from "../common/RepoId";
import { ProjectReview } from "./ReviewResult";

/**
 * Function that can review a project
 */
export type ProjectReviewer<RR extends ProjectReview> =
    (id: RepoId, p: Project) => Promise<RR>;
