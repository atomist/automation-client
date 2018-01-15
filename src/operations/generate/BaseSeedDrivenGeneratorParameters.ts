import { Parameter, Parameters } from "../../decorators";
import { GitHubSourceRepoParameters } from "../common/params/GitHubSourceRepoParameters";
import { SourceRepoParameters } from "../common/params/SourceRepoParameters";
import { GitHubRepoCreationParameters } from "./GitHubRepoCreationParameters";
import { NewRepoCreationParameters } from "./NewRepoCreationParameters";

/**
 * The parameters needed to create a new repo from a seed.
 * Defaults to use GitHub.com, but subclasses can override the source and target parameters.
 */
@Parameters()
export class BaseSeedDrivenGeneratorParameters {

    @Parameter({
        pattern: /^(?:true|false)$/,
        type: "boolean",
        displayName: "Add Atomist webhook",
        description: "whether to add the Atomist webhook to the repository to allow updates",
        validInput: "'true' or 'false'",
        required: false,
        displayable: true,
    })
    public addAtomistWebhook: boolean = false;

    /**
     * Subclasses can override this for non GitHub target strategies.
     * @param {SourceRepoParameters} source
     * @param {NewRepoCreationParameters} target
     */
    constructor(public source: SourceRepoParameters = new GitHubSourceRepoParameters(),
                public target: NewRepoCreationParameters = new GitHubRepoCreationParameters()) {}

}
