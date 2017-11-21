import { Parameter, Parameters, Secret, Secrets } from "../../decorators";
import { GitHubNameRegExp } from "../common/params/gitHubPatterns";

/**
 * Basic editor params. If owner and repo are specified, only the given
 * repo will be edited. Otherwise all repos accessible to the current team
 * will be edited.
 */
@Parameters()
export class BaseEditorParameters {

    @Secret(Secrets.userToken(["repo", "user"]))
    public githubToken;

    @Parameter({description: "Name of owner to edit repo in", ...GitHubNameRegExp, required: false})
    public owner;

    @Parameter({description: "Name of repo to edit", ...GitHubNameRegExp, required: false})
    public repo;

}
