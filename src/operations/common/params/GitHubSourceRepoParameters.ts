import { MappedParameter, MappedParameters } from "../../../decorators";
import { GitHubRepoRef } from "../GitHubRepoRef";
import { SourceRepoParameters } from "./SourceRepoParameters";

export class GitHubSourceRepoParameters extends SourceRepoParameters {

    @MappedParameter(MappedParameters.GitHubApiUrl, false)
    public apiUrl: string;

    get repoRef() {
        return (!!this.owner && !!this.repo) ?
            new GitHubRepoRef(this.owner, this.repo, this.sha, this.apiUrl) :
            undefined;
    }

}
