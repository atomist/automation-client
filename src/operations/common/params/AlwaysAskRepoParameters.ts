import { Parameter, Parameters } from "../../../decorators";
import { GitHubParams } from "./GitHubParams";
import { GitBranchRegExp, GitHubNameRegExp } from "./gitHubPatterns";

/**
 * Basic editor params. Always ask for a repo.
 * Allow regex.
 */
@Parameters()
export class AlwaysAskRepoParameters extends GitHubParams {

    @Parameter({description: "Name of owner to edit repo in", ...GitHubNameRegExp, required: true})
    public owner: string;

    @Parameter({description: "Name of repo to edit or regex", pattern: /.+/, required: true})
    public repo: string;

    @Parameter({description: "Branch or ref. Defaults to 'master'", ...GitBranchRegExp, required: false})
    public sha: string;

}
