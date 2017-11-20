import "mocha";
import { metadataFromInstance } from "../../../src/internal/metadata/metadataReading";

import * as assert from "power-assert";
import { CommandHandler, MappedParameter, Parameter, Secret, Tags } from "../../../src/decorators";
import { HandleCommand } from "../../../src/HandleCommand";
import { HandlerContext } from "../../../src/HandlerContext";
import { MappedParameters } from "../../../src/index";
import { CommandHandlerMetadata } from "../../../src/metadata/automationMetadata";

describe("class with external parameters metadata reading", () => {

    it("should extract metadata from command handler with external parameters", () => {
        const h = new AddAtomistSpringAgentWithExternalParameters();
        const md = metadataFromInstance(h) as CommandHandlerMetadata;
        assert(md.parameters.length === 1);
        assert(md.parameters[0].name === "slackTeam");
        assert(md.mapped_parameters.length === 2);
        assert(md.mapped_parameters[0].local_key === "githubWebUrl");
        assert(md.mapped_parameters[0].foreign_key === "atomist://github_url");
        assert(md.secrets.length === 1);
        assert(md.secrets[0].name === "someSecret");
        assert(md.secrets[0].path === "atomist://some_secret");
    });

});

class AddAtomistSpringAgentParams {

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

    @MappedParameter(MappedParameters.GitHubRepository)
    public repo: string;

    @Secret("atomist://some_secret")
    public someSecret: string;

}

@CommandHandler("add the Atomist Spring Boot agent to a Spring Boot project")
@Tags("atomist", "spring")
class AddAtomistSpringAgentWithExternalParameters implements HandleCommand<AddAtomistSpringAgentParams> {

    public freshParametersInstance() {
        return new AddAtomistSpringAgentParams();
    }

    public handle(context: HandlerContext, params: AddAtomistSpringAgentParams) {
        console.log(`Invocation with team [${params.slackTeam}]`);
        assert(params.someSecret);
        assert(params.slackTeam);
        assert(params.repo !== undefined,
            `this.repo=[${params.repo}],this.slackTeam=[${params.slackTeam}],this.githubWebUrl=[${params.githubWebUrl}]`);
        return Promise.resolve({code: 0});
    }
}
