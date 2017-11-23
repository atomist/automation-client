/**
 * Creates a GitHub Repo and installs Atomist collaborator if necessary
 */
import { CommandHandler } from "../../decorators";
import { BaseSeedDrivenGeneratorParameters } from "./BaseSeedDrivenGeneratorParameters";
import { GenericGenerator } from "./GenericGenerator";

@CommandHandler("copy repo")
export class CopyGenerator extends GenericGenerator<BaseSeedDrivenGeneratorParameters> {

    constructor() {
        super(BaseSeedDrivenGeneratorParameters, () => p => Promise.resolve(p));
    }
}
