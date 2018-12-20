import {
    MappedParameter,
    MappedParameters,
    Parameter,
    Parameters,
} from "../../../decorators";
import { GitHubTargetsParams } from "./GitHubTargetsParams";
import {
    GitBranchRegExp,
    GitShaRegExp,
} from "./validationPatterns";

/**
 * Get target from channel mapping
 */
@Parameters()
export class MappedRepoParameters extends GitHubTargetsParams {

    @MappedParameter(MappedParameters.GitHubOwner)
    public owner: string;

    @MappedParameter(MappedParameters.GitHubRepository)
    public repo: string;

    @Parameter({ description: "Ref", ...GitShaRegExp, required: false })
    public sha: string;

    @Parameter({ description: "Branch Defaults to 'master'", ...GitBranchRegExp, required: false })
    public branch: string = "master";

}
