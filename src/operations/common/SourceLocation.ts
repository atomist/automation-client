
/**
 * Identifies a location within a project.
 * Used in ProjectReviewers
 */
export interface SourceLocation {

    readonly path: string;

    readonly line?: number;

    readonly column?: number;

}
