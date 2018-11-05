import {
    MappedParameter,
    MappedParameters,
} from "../../decorators";
import { GitlabRepoRef } from "../common/GitlabRepoRef";
import { ProjectOperationCredentials } from "../common/ProjectOperationCredentials";
import { RemoteRepoRef } from "../common/RepoId";
import { NewRepoCreationParameters } from "./NewRepoCreationParameters";

/**
 * Parameters common to all generators that create new repositories
 */
export class GitlabRepoCreationParameters extends NewRepoCreationParameters {

    @MappedParameter(MappedParameters.GitHubWebHookUrl)
    public webhookUrl: string;

    constructor(public token: string) {
        super();
    }

    get credentials(): ProjectOperationCredentials {
        return { token: this.token };
    }

    /**
     * Return a single RepoRef or undefined if we're not identifying a single repo
     * This implementation returns a GitHub.com repo but it can be overriden
     * to return any kind of repo
     * @return {RepoRef}
     */
    get repoRef(): RemoteRepoRef {
        return (!!this.owner && !!this.repo) ?
            new GitlabRepoRef(this.owner, this.repo, "master") :
            undefined;
    }

}