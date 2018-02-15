
import * as assert from "power-assert";

import { Parameters } from "../../../decorators";
import { SmartParameters } from "../../../SmartParameters";
import { BaseEditorOrReviewerParameters } from "./BaseEditorOrReviewerParameters";
import { GitHubFallbackReposParameters } from "./GitHubFallbackReposParameters";

/**
 * Editor parameters that apply to a single GitHub repo mapped to a Slack channel,
 * or otherwise use the targets.repos regex.
 */
@Parameters()
export class EditOneOrAllParameters extends BaseEditorOrReviewerParameters implements SmartParameters {

    constructor() {
        super(new GitHubFallbackReposParameters());
    }

    public bindAndValidate() {
        const targets = this.targets as GitHubFallbackReposParameters;
        if (!targets.repo) {
            assert(!!targets.repos, "Must set repos or repo");
            targets.repo = targets.repos;
        }
    }

}
