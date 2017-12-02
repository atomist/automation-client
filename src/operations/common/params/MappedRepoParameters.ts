import { MappedParameter, MappedParameters, Parameter, Parameters } from "../../../decorators";
import { RepoRef } from "../RepoId";
import { GitHubParams } from "./GitHubParams";
import { GitBranchRegExp } from "./gitHubPatterns";

/**
 * Basic editor params. If owner and repo are specified, only the given
 * repo will be edited. Otherwise all repos accessible to the current team
 * will be edited.
 */
@Parameters()
export class MappedRepoParameters extends GitHubParams implements RepoRef {

    @MappedParameter(MappedParameters.GitHubOwner)
    public owner: string;

    @MappedParameter(MappedParameters.GitHubRepository)
    public repo: string;

    @Parameter({description: "Branch or ref. Defaults to 'master'", ...GitBranchRegExp, required: false})
    public sha: string;

}
