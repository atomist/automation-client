import { Parameters } from "../../../decorators";
import { MappedRepoParameters } from "./MappedRepoParameters";
import { TargetsParams } from "./TargetsParams";

/**
 * Contract for all editor or reviewer parameters
 */
export interface EditorOrReviewerParameters {

    /**
     * Describe target repos
     */
    targets: TargetsParams;
}

/**
 * Superclass for all editor or reviewer parameters
 */
@Parameters()
export class BaseEditorOrReviewerParameters implements EditorOrReviewerParameters {

    constructor(public targets: TargetsParams = new MappedRepoParameters()) {}
}
