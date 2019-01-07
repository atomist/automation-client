import {
    MappedParameter,
    MappedParameters,
    Parameter,
} from "../../../decorators";
import { FallbackParams } from "./FallbackParams";
import { GitHubTargetsParams } from "./GitHubTargetsParams";
import {
    GitBranchRegExp,
    GitShaRegExp,
} from "./validationPatterns";

/**
 * Resolve from a Mapped parameter or from a supplied repos regex if no repo mapping
 */
export class GitHubFallbackReposParameters extends GitHubTargetsParams implements FallbackParams {

    @MappedParameter(MappedParameters.GitHubOwner, false)
    public owner: string;

    @MappedParameter(MappedParameters.GitHubRepository, false)
    public repo: string;

    @MappedParameter(MappedParameters.GitHubRepositoryProvider, false)
    public providerId: string;

    @Parameter({ description: "Ref", ...GitShaRegExp, required: false })
    public sha: string;

    @Parameter({ description: "Branch Defaults to 'master'", ...GitBranchRegExp, required: false })
    public branch: string = "master";

    @Parameter({ description: "regex", required: false })
    public repos: string = ".*";

}
