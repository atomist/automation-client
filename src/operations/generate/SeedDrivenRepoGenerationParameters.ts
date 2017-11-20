
import { SourceRepoParameters } from "../common/params/SourceRepoParameters";
import { NewRepoCreationParameters } from "./NewRepoCreationParameters";

/**
 * The parameters needed to create a new repo from a seed
 */
export class SeedDrivenRepoGenerationParameters {

    public source = new SourceRepoParameters();

    public target = new NewRepoCreationParameters();
}
