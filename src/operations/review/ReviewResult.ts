import { HandlerResult } from "../../HandlerResult";
import { RepoRef } from "../common/RepoId";
import { SourceLocation } from "../common/SourceLocation";

export type Severity = "error" | "warn" | "info";

/**
 * A single comment on a project, with optional source location.
 */
export interface ReviewComment {

    readonly severity: Severity;

    /**
     * Name of the category to which this comment applies: E.g. "Usage of Foobar API"
     */
    readonly category: string;

    /**
     * Details of the problem
     */
    readonly detail: string;

    readonly sourceLocation?: SourceLocation;
}

export class DefaultReviewComment implements ReviewComment {

    constructor(public severity: Severity,
                public category: string,
                public detail: string,
                public sourceLocation: SourceLocation) {
    }
}

/**
 * The result of reviewing a single project
 */
export interface ProjectReview {

    repoId: RepoRef;

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
 * @return {{repoId: RepoRef, comments: Array}}
 */
export function clean(repoId: RepoRef): ProjectReview {
    return {
        repoId,
        comments: [],
    };
}
