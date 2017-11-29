
/**
 * Identifies a location within a project.
 * Used in project reviewers
 */
export interface SourceLocation {

    readonly path: string;

    readonly lineFrom1?: number;

    readonly columnFrom1?: number;

    readonly offset: number;

}
