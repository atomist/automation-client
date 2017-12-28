import "mocha";
import { HandlerContext } from "../../../src/HandlerContext";
import { CommandInvocation } from "../../../src/internal/invoker/Payload";
import { BuildableAutomationServer } from "../../../src/server/BuildableAutomationServer";
import { addAtomistSpringAgent } from "../metadata/addAtomistSpringAgent";

describe("function style command handler invocation", () => {

    it("should successfully invoke", done => {
        const ctx: HandlerContext = {
            messageClient: {
                respond(x) {
                    console.log(x);
                    return Promise.resolve(true);
                },
            },
        } as HandlerContext;
        const s = new BuildableAutomationServer({ name: "foobar", version: "1.0.0", teamIds: ["bar"], keywords: [] });
        s.fromCommandHandler(addAtomistSpringAgent);

        const payload: CommandInvocation = {
            name: "AddAtomistSpringAgent",
            mappedParameters: [{ name: "githubWebUrl", value: "the restaurant at the end of the universe" }],
            secrets: [{
                uri: "atomist://some_secret", value: "Vogons write the best poetry",
            }],
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
