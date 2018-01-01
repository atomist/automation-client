import { Parameter } from "../../../decorators";
import { GitHubRepoRef } from "../GitHubRepoRef";
import { RemoteRepoRef, RepoRef } from "../RepoId";
import { GitBranchRegExp, GitHubNameRegExp } from "./gitHubPatterns";
import { RemoteLocator } from "./RemoteLocator";

/**
 * Parameters common to anything that works with a single source repo,
 * such as a seed driven generator
 */
export class SourceRepoParameters implements RepoRef, RemoteLocator {

    @Parameter({
        pattern: GitHubNameRegExp.pattern,
        displayName: "Seed Repository Owner",
        description: "owner, i.e., user or organization, of seed repository",
        validInput: GitHubNameRegExp.validInput,
        minLength: 1,
        maxLength: 100,
        required: false,
        displayable: false,
    })
    public owner: string;

    @Parameter({
        pattern: GitHubNameRegExp.pattern,
        displayName: "Seed Repository Name",
        description: "name of the seed repository",
        validInput: GitHubNameRegExp.validInput,
        minLength: 1,
        maxLength: 100,
        required: false,
        displayable: false,
    })
    public repo: string;

    @Parameter({
        pattern: GitBranchRegExp.pattern,
        displayName: "Seed Branch",
        description: "seed repository branch to clone for new project",
        validInput: GitBranchRegExp.validInput,
        minLength: 1,
        maxLength: 256,
        required: false,
        displayable: false,
    })
    public sha: string = "master";

    /**
     * Return a single RepoRef
     * This implementation returns a GitHub.com repo but it can be overridden
     * to return any kind of repo
     * @return {RepoRef}
     */
    get repoRef(): RemoteRepoRef {
        return (!!this.owner && !!this.repo) ?
            new GitHubRepoRef(this.owner, this.repo) :
            undefined;
    }

}
