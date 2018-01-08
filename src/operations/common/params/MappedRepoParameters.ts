import { MappedParameter, MappedParameters, Parameter, Parameters } from "../../../decorators";
import { GitBranchRegExp } from "./gitHubPatterns";
import { GitHubTargetsParams } from "./GitHubTargetsParams";

/**
 * Get target from channel mapping
 */
@Parameters()
export class MappedRepoParameters extends GitHubTargetsParams {

    @MappedParameter(MappedParameters.GitHubOwner)
    public owner: string;

    @MappedParameter(MappedParameters.GitHubRepository)
    public repo: string;

    @Parameter({ description: "Branch or ref. Defaults to 'master'", ...GitBranchRegExp, required: false })
    public sha: string;

}
