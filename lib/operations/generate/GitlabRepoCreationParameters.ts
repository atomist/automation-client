import {
    MappedParameter,
    MappedParameters,
} from "../../decorators";
import { GitlabPrivateTokenCredentials } from "../common/GitlabPrivateTokenCredentials";
import {
    GitlabRepoRef,
} from "../common/GitlabRepoRef";
import { ProjectOperationCredentials } from "../common/ProjectOperationCredentials";
import { RemoteRepoRef } from "../common/RepoId";
import { NewRepoCreationParameters } from "./NewRepoCreationParameters";

/**
 * Parameters common to all generators that create new repositories on Gitlab
 */
export class GitlabRepoCreationParameters extends NewRepoCreationParameters {

    @MappedParameter(MappedParameters.GitHubWebHookUrl)
    public webhookUrl: string;

    public token: string;

    @MappedParameter(MappedParameters.GitHubApiUrl)
    public apiUrl: string;

    @MappedParameter(MappedParameters.GitHubUrl)
    public baseRemoteUrl: string;

    get credentials(): ProjectOperationCredentials {
        return { privateToken: this.token } as GitlabPrivateTokenCredentials;
    }

    /**
     * Return a single RepoRef or undefined if we're not identifying a single repo
     * This implementation returns a Gitlab.com repo but it can be overriden
     * to return any kind of repo
     * @return {RepoRef}
     */
    get repoRef(): RemoteRepoRef {
        return (!!this.owner && !!this.repo) ?
            GitlabRepoRef.from({
                owner: this.owner,
                repo: this.repo,
                branch: "master",
                rawApiBase: this.apiUrl,
                gitlabRemoteUrl: this. baseRemoteUrl,
            }) : undefined;
    }
}
