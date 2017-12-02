import { Parameter, Parameters } from "../../../decorators";
import { RepoRef } from "../RepoId";
import { GitHubParams } from "./GitHubParams";
import { GitBranchRegExp, GitHubNameRegExp } from "./gitHubPatterns";

/**
 * Basic editor params. If owner and repo are specified, only the given
 * repo will be edited. Otherwise all repos accessible to the current team
 * will be edited.
 */
@Parameters()
export class AllReposByDefaultParameters extends GitHubParams implements RepoRef {

    @Parameter({description: "Name of owner to edit repo in", ...GitHubNameRegExp, required: false})
    public owner: string;

    @Parameter({description: "Name of repo to edit", ...GitHubNameRegExp, required: false})
    public repo: string;

    @Parameter({description: "Branch or ref. Defaults to 'master'", ...GitBranchRegExp, required: false})
    public sha: string;

}
