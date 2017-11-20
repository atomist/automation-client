import "mocha";
import { metadataFromInstance } from "../../../src/internal/metadata/metadataReading";

import * as assert from "power-assert";
import { CommandHandler, MappedParameter, Parameter, Secret, Tags } from "../../../src/decorators";
import { HandleCommand } from "../../../src/HandleCommand";
import { HandlerContext } from "../../../src/HandlerContext";
import { MappedParameters } from "../../../src/index";
import { CommandHandlerMetadata } from "../../../src/metadata/automationMetadata";
import { GitHubRepoRef } from "../../../src/operations/common/GitHubRepoRef";

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

    it("should extract metadata from command handler with external nested parameters", () => {
        const h = new AddAtomistSpringAgentWithComposedParameters();
        const md = metadataFromInstance(h) as CommandHandlerMetadata;
        assert(md.parameters.length === 1);
        assert(md.parameters[0].name === "params.slackTeam");
        assert(md.mapped_parameters.length === 2);
        assert(md.mapped_parameters[0].local_key === "params.githubWebUrl");
        assert(md.mapped_parameters[0].foreign_key === "atomist://github_url");
        assert(md.secrets.length === 1);
        assert(md.secrets[0].name === "secrets.someSecret");
        assert(md.secrets[0].path === "atomist://some_secret");
    });

    it("should extract metadata from command handler with direct nested parameters", () => {
        const h = new AddAtomistSpringAgentWithComposedParametersDirectlyOnHandler();
        const md = metadataFromInstance(h) as CommandHandlerMetadata;
        assert(md.parameters.length === 1);
        assert(md.parameters[0].name === "params.slackTeam");
        assert(md.mapped_parameters.length === 2);
        assert(md.mapped_parameters[0].local_key === "params.githubWebUrl");
        assert(md.mapped_parameters[0].foreign_key === "atomist://github_url");
        assert(md.secrets.length === 1);
        assert(md.secrets[0].name === "secrets.someSecret");
        assert(md.secrets[0].path === "atomist://some_secret");
    });

    it("should extract metadata from command handler with direct nested parameters and irrelevant fields", () => {
        const h = new AddAtomistSpringAgentWithComposedParametersDirectlyOnHandlerAndIrrelevantFields();
        const md = metadataFromInstance(h) as CommandHandlerMetadata;
        assert(md.parameters.length === 1);
        assert(md.parameters[0].name === "params.slackTeam");
        assert(md.mapped_parameters.length === 2);
        assert(md.mapped_parameters[0].local_key === "params.githubWebUrl");
        assert(md.mapped_parameters[0].foreign_key === "atomist://github_url");
        assert(md.secrets.length === 1);
        assert(md.secrets[0].name === "secrets.someSecret");
        assert(md.secrets[0].path === "atomist://some_secret");
    });

    it("should extract metadata from command handler with direct nested parameters and additional simple parameter", () => {
        const h = new AddAtomistSpringAgentWithComposedParametersDirectlyOnHandlerAndStringParam();
        const md = metadataFromInstance(h) as CommandHandlerMetadata;
        assert(md.parameters.length === 2);
        assert(md.parameters[0].name === "foo");
        assert(md.parameters[1].name === "params.slackTeam");
        assert(md.mapped_parameters.length === 2);
        assert(md.mapped_parameters[0].local_key === "params.githubWebUrl");
        assert(md.mapped_parameters[0].foreign_key === "atomist://github_url");
        assert(md.secrets.length === 1);
        assert(md.secrets[0].name === "secrets.someSecret");
        assert(md.secrets[0].path === "atomist://some_secret");
    });

    it("should extract metadata from command handler with direct composed parameters", () => {
        const h = new AddAtomistSpringAgentWithComposedExternalParameters();
        const md = metadataFromInstance(h) as CommandHandlerMetadata;
        assert(md.parameters.length === 2);
        assert(md.parameters[0].name === "foo");
        assert(md.parameters[1].name === "args.params.slackTeam");
        assert(md.mapped_parameters.length === 2);
        assert(md.mapped_parameters[0].local_key === "args.params.githubWebUrl");
        assert(md.mapped_parameters[0].foreign_key === "atomist://github_url");
        assert(md.secrets.length === 1);
        assert(md.secrets[0].name === "args.secrets.someSecret");
        assert(md.secrets[0].path === "atomist://some_secret");
    });

    it("should extract metadata from command handler with inherited and composed parameters", () => {
        const h = new AddAtomistSpringAgentWithInheritedAndComposedParameters();
        const md = metadataFromInstance(h) as CommandHandlerMetadata;
        assert(md.parameters.length === 2);
        assert(md.parameters[0].name === "foo");
        assert(md.parameters[1].name === "args.slackTeam");
        assert(md.mapped_parameters.length === 2);
        assert(md.mapped_parameters[0].local_key === "args.githubWebUrl");
        assert(md.mapped_parameters[0].foreign_key === "atomist://github_url");
        assert(md.secrets.length === 1);
        assert(md.secrets[0].name === "args.someSecret");
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

class AddAtomistSpringAgentParamsPart {

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
}

class AddAtomistSpringAgentSecretsPart {

    @Secret("atomist://some_secret")
    public someSecret: string;
}

class ComposedAddAtomistSpringAgentParameters {

    public params = new AddAtomistSpringAgentParamsPart();

    public secrets = new AddAtomistSpringAgentSecretsPart();

}

@CommandHandler("add the Atomist Spring Boot agent to a Spring Boot project")
@Tags("atomist", "spring")
class AddAtomistSpringAgentWithComposedParameters implements HandleCommand<ComposedAddAtomistSpringAgentParameters> {

    public freshParametersInstance() {
        return new ComposedAddAtomistSpringAgentParameters();
    }

    public handle(context: HandlerContext, params: ComposedAddAtomistSpringAgentParameters) {
        console.log(`Invocation with team [${params.params.slackTeam}]`);
        assert(params.secrets.someSecret);
        assert(params.params.slackTeam);
        assert(params.params.repo !== undefined,
            `this.repo=[${params.params.repo}],this.slackTeam=[${params.params.slackTeam}],this.githubWebUrl=[${params.params.githubWebUrl}]`);
        return Promise.resolve({code: 0});
    }
}

@CommandHandler("add the Atomist Spring Boot agent to a Spring Boot project")
@Tags("atomist", "spring")
class AddAtomistSpringAgentWithComposedParametersDirectlyOnHandler implements HandleCommand {

    public params = new AddAtomistSpringAgentParamsPart();

    public secrets = new AddAtomistSpringAgentSecretsPart();

    public handle(context: HandlerContext, params: this) {
        console.log(`Invocation with team [${params.params.slackTeam}]`);
        assert(params.secrets.someSecret);
        assert(params.params.slackTeam);
        assert(params.params.repo !== undefined,
            `this.repo=[${params.params.repo}],this.slackTeam=[${params.params.slackTeam}],this.githubWebUrl=[${params.params.githubWebUrl}]`);
        return Promise.resolve({code: 0});
    }
}

@CommandHandler("add the Atomist Spring Boot agent to a Spring Boot project")
@Tags("atomist", "spring")
class AddAtomistSpringAgentWithComposedParametersDirectlyOnHandlerAndIrrelevantFields implements HandleCommand {

    public params = new AddAtomistSpringAgentParamsPart();

    public secrets = new AddAtomistSpringAgentSecretsPart();

    public irrelevantObject = new GitHubRepoRef("a", "b");

    public irrevelantString = "ignore me";

    public handle(context: HandlerContext, params: this) {
        console.log(`Invocation with team [${params.params.slackTeam}]`);
        assert(params.secrets.someSecret);
        assert(params.params.slackTeam);
        assert(params.params.repo !== undefined,
            `this.repo=[${params.params.repo}],this.slackTeam=[${params.params.slackTeam}],this.githubWebUrl=[${params.params.githubWebUrl}]`);
        return Promise.resolve({code: 0});
    }
}

@CommandHandler("add the Atomist Spring Boot agent to a Spring Boot project")
@Tags("atomist", "spring")
class AddAtomistSpringAgentWithComposedParametersDirectlyOnHandlerAndStringParam implements HandleCommand {

    public params = new AddAtomistSpringAgentParamsPart();

    public secrets = new AddAtomistSpringAgentSecretsPart();

    @Parameter()
    public foo: string;

    public handle(context: HandlerContext, params: this) {
        console.log(`Invocation with team [${params.params.slackTeam}]`);
        assert(params.secrets.someSecret);
        assert(params.params.slackTeam);
        assert(params.params.repo !== undefined,
            `this.repo=[${params.params.repo}],this.slackTeam=[${params.params.slackTeam}],this.githubWebUrl=[${params.params.githubWebUrl}]`);
        return Promise.resolve({code: 0});
    }
}

class ComposeAllAddAtomistSpringAgentParams {

    public params = new AddAtomistSpringAgentParamsPart();

    public secrets = new AddAtomistSpringAgentSecretsPart();

}

@CommandHandler("add the Atomist Spring Boot agent to a Spring Boot project")
@Tags("atomist", "spring")
class AddAtomistSpringAgentWithComposedExternalParameters implements HandleCommand {

    public args = new ComposeAllAddAtomistSpringAgentParams();

    @Parameter()
    public foo: string;

    public handle(context: HandlerContext, params: this) {
        console.log(`Invocation with team [${params.args.params.slackTeam}]`);
        assert(params.args.secrets.someSecret);
        assert(params.args.params.slackTeam);
        assert(params.args.params.repo !== undefined);
        return Promise.resolve({code: 0});
    }
}

class InheritedAndComposeParams extends AddAtomistSpringAgentParamsPart {

    @Secret("atomist://some_secret")
    public someSecret: string;
}

@CommandHandler("add the Atomist Spring Boot agent to a Spring Boot project")
@Tags("atomist", "spring")
class AddAtomistSpringAgentWithInheritedAndComposedParameters implements HandleCommand {

    public args = new InheritedAndComposeParams();

    @Parameter()
    public foo: string;

    public handle(context: HandlerContext, params: this) {
        console.log(`Invocation with team [${params.args.slackTeam}]`);
        assert(params.args.someSecret);
        assert(params.args.slackTeam);
        assert(params.args.repo !== undefined);
        return Promise.resolve({code: 0});
    }
}
