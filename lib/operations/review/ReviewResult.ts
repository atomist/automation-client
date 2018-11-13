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
     * Name of the category to which this comment applies: E.g. "API usage".
     * Should be human readable. Review comments are typically filtered by
     * category when reported.
     */
    readonly category: string;

    /**
     * Name of the more specific category to which this comment applies if available,
     * E.g. "Usage of Foobar API". Review comments are typically sorted by
     * subcategory when reported.
     */
    readonly subcategory?: string;

    /**
     * Details of the problem
     */
    readonly detail: string;

    readonly sourceLocation?: SourceLocation;

    /**
     * Command invocation that will fix this problem
     */
    readonly fix?: Fix;
}

/**
 * Coordinates of an Atomist command handler to fix a specific problem
 */
export interface Fix {

    command: string;

    params: {
        [propName: string]: string | number,
    };

}

export class DefaultReviewComment implements ReviewComment {

    constructor(public severity: Severity,
                public category: string,
                public detail: string,
                public sourceLocation: SourceLocation,
                public fix?: Fix) {
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

/**
 * Function suitable for use by Array.prototype.sort() to sort review
 * comments by severity, category, subcategory, and sourceLocation
 * path and offset.  Items with the same severity, category, and
 * subcategory without a location are sorted before those having a
 * location.
 *
 * @param a First element to compare.
 * @param b Second element to compare.
 * @return -1 if a sorts first, 1 if b sorts first, and 0 if they are equivalent.
 */
export function reviewCommentSorter(a: ReviewComment, b: ReviewComment): number {
    if (a.severity !== b.severity) {
        const severities = ["error", "warn", "info"];
        for (const severity of severities) {
            if (a.severity === severity) {
                return -1;
            } else if (b.severity === severity) {
                return 1;
            }
        }
    }
    if (a.category !== b.category) {
        return a.category.localeCompare(b.category);
    }
    if (a.subcategory !== b.subcategory) {
        return a.subcategory.localeCompare(b.subcategory);
    }

    if (!a.sourceLocation && b.sourceLocation) {
        return -1;
    } else if (a.sourceLocation && !b.sourceLocation) {
        return 1;
    } else if (a.sourceLocation && b.sourceLocation) {
        if (a.sourceLocation.path !== b.sourceLocation.path) {
            return a.sourceLocation.path.localeCompare(b.sourceLocation.path);
        } else {
            return a.sourceLocation.offset - b.sourceLocation.offset;
        }
    }
    return 0;
}
