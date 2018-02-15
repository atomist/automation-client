import { MappedParameter, MappedParameters, Parameter } from "../../../decorators";
import { GitBranchRegExp } from "./gitHubPatterns";
import { GitHubTargetsParams } from "./GitHubTargetsParams";

/**
 * Resolve from a Mapped parameter or from a supplied repos regex if no repo mapping
 */
export class GitHubFallbackReposParameters extends GitHubTargetsParams {

    @MappedParameter(MappedParameters.GitHubOwner, false)
    public owner: string;

    @MappedParameter(MappedParameters.GitHubRepository, false)
    public repo: string;

    @Parameter({description: "Branch or ref. Defaults to 'master'", ...GitBranchRegExp, required: false})
    public sha: string = "master";

    @Parameter({description: "regex", required: false})
    public repos: string = ".*";

}
