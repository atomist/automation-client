import { SlackMessage } from "@atomist/slack-messages/SlackMessages";
import { ConfigurableCommandHandler } from "../../src/decorators";
import { failure, Success } from "../../src/HandlerResult";
import { Failure, HandleCommand, HandlerContext, HandlerResult, Parameter } from "../../src/index";
import { ReposQuery, ReposQueryVariables } from "../../src/schema/schema";
import {
    addressSlackUsers, buttonForCommand, menuForCommand,
    SlackDestination,
} from "../../src/spi/message/MessageClient";
import { SecretBaseHandler } from "./SecretBaseHandler";

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

@ConfigurableCommandHandler("Send a hello back to the client", { intent: "hello tanya", autoSubmit: true })
export class HelloWorld extends SecretBaseHandler implements HandleCommand {

    @Parameter({ description: "Name of person the greeting should be send to", pattern: /^.*$/ })
    public name: string;

    public handle(ctx: HandlerContext): Promise<HandlerResult> {
        console.log(`Incoming parameter was ${this.name}`);

        if (this.name === "fail") {
            return Promise.resolve(Failure);
        }

        const msg: any = {
            content: `{"hello": "${this.name}"}`,
            title: "Test title",
            filetype: "javascript",
        };

        /*let counter = 0;
        while (counter < 100000) {
            counter++;
        }*/

        return ctx.messageClient.addressUsers(msg, this.name)
            .then(() => Success, failure);

        // { fetchPolicy: "network-only" };
        /*return ctx.graphClient.executeQueryFromFile<ReposQuery, ReposQueryVariables>("graphql/repos",
            { teamId: "T1L0VDKJP", offset: 0 }, {})
            // .then(() => sleep(70000))
            .then(() => {
                return ctx.messageClient.send(msg, addressSlackUsers(ctx.source.slack.team.id, "cd"));
            })
            .then(() => ({ code: 0, redirect: "http://google.com" }));*/
    }
}
