import "mocha";
import { metadataFromInstance } from "../../../src/internal/metadata/metadataReading";

import * as assert from "power-assert";
import { HandlerContext } from "../../../src/HandlerContext";
import { CommandInvocation } from "../../../src/internal/invoker/Payload";
import { CommandHandlerMetadata } from "../../../src/internal/metadata/metadata";
import { BuildableAutomationServer } from "../../../src/server/BuildableAutomationServer";
import { AddAtomistSpringAgent, AddAtomistSpringAgentParams } from "./decoratedFunctions";

describe("function style metadata reading", () => {

    it("should get correct handler name", () => {
        assert(metadataFromInstance(AddAtomistSpringAgent).name === "AddAtomistSpringAgent");
    });

    it("should extract metadataFromInstance from function sourced command handler", () => {
        const md = metadataFromInstance(AddAtomistSpringAgent) as CommandHandlerMetadata;
        assert(md.parameters.length === 1);
        assert(md.parameters[0].name === "slackTeam");
        assert(md.mapped_parameters.length === 1);
        assert(md.mapped_parameters[0].local_key === "githubWebUrl");
        assert(md.mapped_parameters[0].foreign_key === "atomist://github_url");
        assert(md.secrets.length === 1);
        assert(md.secrets[0].name === "someSecret");
        assert(md.secrets[0].path === "atomist://some_secret");
    });

    it("should successfully invoke", done => {
        const ctx: HandlerContext = {
            messageClient: {
                respond(x) {
                    console.log(x);
                    return Promise.resolve(true);
                },
            },
        } as HandlerContext;
        const s = new BuildableAutomationServer({name: "foobar", version: "1.0.0", teamIds: ["bar"], keywords: []});
        s.fromCommandHandler(AddAtomistSpringAgent);

        const payload: CommandInvocation = {
            name: "AddAtomistSpringAgent",
            mappedParameters: [],
            secrets : [],
            args: [{
                name: "slackTeam",
                value: "T1066",
            }],
        };
        s.invokeCommand(payload, ctx).then(hr => {
            done();
        }).catch(done);
    });

});
