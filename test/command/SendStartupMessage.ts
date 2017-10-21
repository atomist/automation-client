import { SlackMessage } from "@atomist/slack-messages/SlackMessages";
import { CommandHandler, Parameter } from "../../src/decorators";
import { HandleCommand, HandlerContext, HandlerResult } from "../../src/Handlers";
import { sendMessages } from "../../src/operations/support/contextUtils";

@CommandHandler("Sends a startup message to the owner of this automation-client")
export class SendStartupMessage implements HandleCommand {

    @Parameter({pattern: /^.*$/})
    public owner: string;

    @Parameter({pattern: /^.*$/})
    public name: string;

    @Parameter({pattern: /^.*$/})
    public version: string;

    public handle(ctx: HandlerContext): Promise<HandlerResult> {
        const msg: SlackMessage = {
            text: `It's me, \`${this.name}/${this.version}\`! I'm now running!`,
        };

        ctx.messageClient.recordAddressUsers(msg, this.owner);
        return sendMessages(ctx);
    }
}
