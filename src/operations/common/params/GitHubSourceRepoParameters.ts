import { GitHubRepoRef } from "../GitHubRepoRef";
import { SourceRepoParameters } from "./SourceRepoParameters";

export class GitHubSourceRepoParameters extends SourceRepoParameters {

    get repoRef() {
        return (!!this.owner && !!this.repo) ?
            new GitHubRepoRef(this.owner, this.repo) :
            undefined;
    }

}
