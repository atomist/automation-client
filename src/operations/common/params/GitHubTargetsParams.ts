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
        return { token: this.githubToken };
    }

    /**
     * Return a single RepoRef or undefined if we're not identifying a single repo
     * @return {RepoRef}
     */
    get repoRef(): GitHubRepoRef {
        if (!this.owner || !this.repo || this.usesRegex) {
            return undefined;
        }
        // sha is actually a ref (either sha or pointer)
        const branch = isValidSHA1(this.sha) ? undefined : this.sha;
        const sha = isValidSHA1(this.sha) ? this.sha : undefined;
        return GitHubRepoRef.from({ owner: this.owner, repo: this.repo, sha, branch, rawApiBase: this.apiUrl });
    }

    @Secret(Secrets.userToken(["repo", "user:email", "read:user"]))
    private githubToken: string;

}

function isValidSHA1(s: string): boolean {
    if (!s) {
        return false;
    }
    return s.match(/[a-fA-F0-9]{40}/) != null;
}
