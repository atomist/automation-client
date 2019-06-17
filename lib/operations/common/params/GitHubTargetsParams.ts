import {
    MappedParameter,
    MappedParameters,
    Parameters,
    Secret,
    Secrets,
} from "../../../decorators";
import { GitHubRepoRef } from "../GitHubRepoRef";
import { ProjectOperationCredentials } from "../ProjectOperationCredentials";
import { TargetsParams } from "./TargetsParams";

/**
 * Base parameters for working with GitHub repo(s).
 * Allows use of regex.
 */
@Parameters()
export abstract class GitHubTargetsParams extends TargetsParams {

    @MappedParameter(MappedParameters.GitHubApiUrl, false)
    public apiUrl: string;

    get credentials(): ProjectOperationCredentials {
        if (!!this.githubToken) {
            return { token: this.githubToken };
        } else {
            return undefined;
        }
    }

    /**
     * Return a single RepoRef or undefined if we're not identifying a single repo
     * @return {RepoRef}
     */
    get repoRef(): GitHubRepoRef {
        if (!this.owner || !this.repo || this.usesRegex) {
            return undefined;
        }
        return GitHubRepoRef.from({
            owner: this.owner,
            repo: this.repo,
            sha: this.sha,
            branch: this.branch,
            rawApiBase: this.apiUrl,
        });
    }

    @Secret(Secrets.userToken(["repo", "user:email", "read:user"]))
    private readonly githubToken: string;

}
