import { Parameters } from "../../../decorators";
import { GitHubTargetsParams } from "./GitHubTargetsParams";
import { MappedRepoParameters } from "./MappedRepoParameters";

/**
 * Contract for all editor or reviewer parameters
 */
export interface EditorOrReviewerParameters {

    /**
     * Describe target repos
     */
    targets: GitHubTargetsParams;
}

/**
 * Superclass for all editor or reviewer parameters
 */
@Parameters()
export class BaseEditorOrReviewerParameters implements EditorOrReviewerParameters {

    constructor(public targets: GitHubTargetsParams = new MappedRepoParameters()) { }
}
