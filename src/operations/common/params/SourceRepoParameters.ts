
import { Parameter } from "../../../decorators";
import { GitBranchRegExp, GitHubNameRegExp } from "./gitHubPatterns";

/**
 * Parameters common to anything that works with a single source repo,
 * such as a seed driven generator
 */
export class SourceRepoParameters {

    @Parameter({
        pattern: GitHubNameRegExp.pattern,
        displayName: "Seed Repository Owner",
        description: "owner, i.e., user or organization, of seed repository",
        validInput: GitHubNameRegExp.validInput,
        minLength: 1,
        maxLength: 50,
        required: false,
        displayable: false,
    })
    public sourceOwner: string;

    @Parameter({
        pattern: GitHubNameRegExp.pattern,
        displayName: "Seed Repository Name",
        description: "name of the seed repository",
        validInput: GitHubNameRegExp.validInput,
        minLength: 1,
        maxLength: 50,
        required: false,
        displayable: false,
    })
    public sourceRepo: string;

    @Parameter({
        pattern: GitBranchRegExp.pattern,
        displayName: "Seed Branch",
        description: "seed repository branch to clone for new project",
        validInput: GitBranchRegExp.validInput,
        minLength: 1,
        maxLength: 50,
        required: false,
        displayable: false,
    })
    public sourceBranch: string = "master";

}
