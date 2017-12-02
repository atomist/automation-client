import { MappedParameter, MappedParameters, Parameter, Parameters } from "../../decorators";
import { SourceRepoParameters } from "../common/params/SourceRepoParameters";
import { NewRepoCreationParameters } from "./NewRepoCreationParameters";

/**
 * The parameters needed to create a new repo from a seed
 */
@Parameters()
export class BaseSeedDrivenGeneratorParameters {

    public source = new SourceRepoParameters();

    public target = new NewRepoCreationParameters();

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

    @MappedParameter(MappedParameters.GitHubWebHookUrl)
    public webhookUrl: string;

}
