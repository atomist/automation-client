import { MappedParameter, MappedParameters, Secret, Secrets } from "../../decorators";
import { GitHubRepoRef } from "../common/GitHubRepoRef";
import { ProjectOperationCredentials } from "../common/ProjectOperationCredentials";
import { RemoteRepoRef } from "../common/RepoId";
import { NewRepoCreationParameters } from "./NewRepoCreationParameters";

/**
 * Parameters common to all generators that create new repositories
 */
export class GitHubRepoCreationParameters extends NewRepoCreationParameters {

    @Secret(Secrets.userToken(["repo", "user:email", "read:user"]))
    public githubToken;

    @MappedParameter(MappedParameters.GitHubWebHookUrl)
    public webhookUrl: string;

    get credentials(): ProjectOperationCredentials {
        return { token: this.githubToken };
    }

    /**
     * Return a single RepoRef or undefined if we're not identifying a single repo
     * This implementation returns a GitHub.com repo but it can be overriden
     * to return any kind of repo
     * @return {RepoRef}
     */
    get repoRef(): RemoteRepoRef {
        return (!!this.owner && !!this.repo) ?
            new GitHubRepoRef(this.owner, this.repo) :
            undefined;
    }

}
