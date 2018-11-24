import {
    MappedParameter,
    Parameter,
    Parameters,
    Secret,
    Value,
} from "../../../lib/decorators";
import { HandleCommand } from "../../../lib/HandleCommand";
import { commandHandlerFrom } from "../../../lib/onCommand";
import { succeed } from "../../../lib/operations/support/contextUtils";

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

    @Value({ path: "custom.http.port", required: true })
    public port: number;
}

// Note we need an explicit type annotation here to avoid an error
// due to exporting an un-imported type
// Alternatively, if it's not exported it's fine
export const addAtomistSpringAgent: HandleCommand =
    commandHandlerFrom((ctx, params) =>
        ctx.messageClient.respond("I got your message: slackTeam=" + params.slackTeam)
            .then(succeed),
        AddAtomistSpringAgentParams,
        "AddAtomistSpringAgent",
        "add the Atomist Agent to a Spring Boot project",
        "add agent",
        ["atomist", "spring", "agent"],
        true);
