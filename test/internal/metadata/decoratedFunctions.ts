import { MappedParameter, Parameter, Parameters, Secret } from "../../../src/decorators";
import { SelfDescribingHandleCommand } from "../../../src/HandleCommand";
import { commandHandlerFrom, Handler } from "../../../src/handler";
import { succeed } from "../../../src/operations/support/contextUtils";

@Parameters()
export class AddAtomistSpringAgentParams {

    @Parameter({
        displayName: "Slack Team ID",
        description: "team identifier for Slack team associated with this repo",
        pattern: /^T[0-9A-Z]+$/,
        validInput: "Slack team identifier of form T0123WXYZ",
        required: true,
    })
    public slackTeam: string;

    @MappedParameter("atomist://github_url")
    public githubWebUrl: string;

    @Secret("atomist://some_secret")
    public someSecret: string;
}

const addAtomistSpringAgent: Handler<AddAtomistSpringAgentParams> =
    (ctx, params) =>
         ctx.messageClient.respond("I got your message: slackTeam=" + params.slackTeam)
            .then(succeed);

export const AddAtomistSpringAgent: SelfDescribingHandleCommand<AddAtomistSpringAgentParams> =
    commandHandlerFrom(addAtomistSpringAgent,
        AddAtomistSpringAgentParams,
        "AddAtomistSpringAgent",
        "add something");
