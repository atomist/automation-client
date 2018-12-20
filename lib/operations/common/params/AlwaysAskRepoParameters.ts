import {
    Parameter,
    Parameters,
} from "../../../decorators";
import { GitHubTargetsParams } from "./GitHubTargetsParams";
import {
    GitBranchRegExp,
    GitHubNameRegExp,
    GitShaRegExp,
} from "./validationPatterns";

/**
 * Basic editor params. Always ask for a repo.
 * Allow regex.
 */
@Parameters()
export class AlwaysAskRepoParameters extends GitHubTargetsParams {

    @Parameter({ description: "Name of owner to edit repo in", ...GitHubNameRegExp, required: true })
    public owner: string;

    @Parameter({ description: "Name of repo to edit or regex", pattern: /.+/, required: true })
    public repo: string;

    @Parameter({ description: "Ref", ...GitShaRegExp, required: false })
    public sha: string;

    @Parameter({ description: "Branch Defaults to 'master'", ...GitBranchRegExp, required: false })
    public branch: string = "master";

}
