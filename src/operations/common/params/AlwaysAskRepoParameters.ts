import { Parameter, Parameters } from "../../../decorators";
import { RepoRef } from "../RepoId";
import { GitHubParams } from "./GitHubParams";
import { GitBranchRegExp, GitHubNameRegExp } from "./gitHubPatterns";

/**
 * Basic editor params. Always ask for a repo
 */
@Parameters()
export class AlwaysAskRepoParameters extends GitHubParams implements RepoRef {

    @Parameter({description: "Name of owner to edit repo in", ...GitHubNameRegExp, required: true})
    public owner: string;

    @Parameter({description: "Name of repo to edit", ...GitHubNameRegExp, required: true})
    public repo: string;

    @Parameter({description: "Branch or ref. Defaults to 'master'", ...GitBranchRegExp, required: false})
    public sha: string;

}
