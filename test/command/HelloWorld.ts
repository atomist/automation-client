import { logger } from "../../src/internal/util/logger";

import { SlackMessage } from "@atomist/slack-messages/SlackMessages";
import { CommandHandler, Parameter, Secret } from "../../src/decorators";
import { HandleCommand, HandlerContext, HandlerResult, Secrets } from "../../src/Handlers";
import { sendMessages } from "../../src/operations/support/contextUtils";
import { buttonForCommand, menuForCommand } from "../../src/spi/message/MessageClient";

@CommandHandler("Sends a hello back to the client", "hello cd")
export class HelloWorld implements HandleCommand {

    @Parameter({pattern: /^.*$/})
    public name: string;

    public handle(ctx: HandlerContext): Promise<HandlerResult> {
        logger.info(`Incoming parameter was ${this.name}`);

        const msg: SlackMessage = {
            text: `Send hello again, @${this.name}?`,
            attachments: [{
                fallback: "Some buttons",
                actions: [
                    buttonForCommand({text: "yes"}, "HelloWorld", { name: this.name }),
                    menuForCommand({text: "select name", options:
                            [ { value: "cd", text: "cd" }, { value: "kipz", text: "kipz"}]},
                        "HelloWorld", "name"),
                ],
            }],
        };

        ctx.messageClient.recordAddressUsers(msg, "cd");
            // .recordRespond(`Hello ${this.name}`)
            // .recordRespond(msg)
            // .recordAddressChannels(msg, "general");
        return sendMessages(ctx);
    }
}
