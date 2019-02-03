import { Parameters } from "../../decorators";
import { GitHubSourceRepoParameters } from "../common/params/GitHubSourceRepoParameters";
import { SourceRepoParameters } from "../common/params/SourceRepoParameters";
import { GitHubRepoCreationParameters } from "./GitHubRepoCreationParameters";
import { RepoCreationParameters } from "./RepoCreationParameters";
import { SeedDrivenGeneratorParameters } from "./SeedDrivenGeneratorParameters";

/**
 * Default parameters needed to create a new repo from a seed.
 * Defaults to use GitHub.com, but subclasses can override the source and target parameters.
 */
@Parameters()
export class BaseSeedDrivenGeneratorParameters implements SeedDrivenGeneratorParameters {

    /**
     * Subclasses can override this for non GitHub target strategies.
     * @param {SourceRepoParameters} source
     * @param {NewRepoCreationParameters} target
     */
    constructor(public source: SourceRepoParameters = new GitHubSourceRepoParameters(),
                public target: RepoCreationParameters = new GitHubRepoCreationParameters()) {}

}
