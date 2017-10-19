import { HandlerResult } from "../../HandlerResult";
import { Issue } from "../../internal/util/gitHub";
import { RepoId } from "../common/RepoId";
import { SourceLocation } from "../common/SourceLocation";

export type Severity = "error" | "warn" | "info";

export interface ReviewComment {

    readonly severity: Severity;

    readonly comment: string;

    readonly sourceLocation?: SourceLocation;

    /**
     * If this is set, the information that should
     * be used to raise an Issue.
     */
    issue?: Issue;
}

/**
 * The result of reviewing a single project
 */
export interface ProjectReview {

    repoId: RepoId;

    comments: ReviewComment[];
}

/**
 * The result of reviewing many projects: For example,
 * all the projects in an org
 */
export interface ReviewResult<T extends ProjectReview = ProjectReview> extends HandlerResult {

    projectsReviewed: number;

    projectReviews: T[];

}

/**
 * Give a project a clean bill of health, with no comments
 * @param repoId identification of project
 * @return {{repoId: RepoId, comments: Array}}
 */
export function clean(repoId: RepoId): ProjectReview {
    return {
        repoId,
        comments: [],
    };
}
