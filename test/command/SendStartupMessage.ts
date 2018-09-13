import { SlackMessage } from "@atomist/slack-messages";
import {
    CommandHandler,
    Parameter,
} from "../../lib/decorators";
import { HandleCommand } from "../../lib/HandleCommand";
import { HandlerContext } from "../../lib/HandlerContext";
import { HandlerResult } from "../../lib/HandlerResult";
import { addressSlackUsers } from "../../lib/spi/message/MessageClient";

@CommandHandler("Sends a startup message to the owner of this automation-client")
export class SendStartupMessage implements HandleCommand {

    @Parameter({ pattern: /^.*$/ })
    public owner: string;

    @Parameter({ pattern: /^.*$/ })
    public name: string;

    @Parameter({ pattern: /^.*$/ })
    public version: string;

    public handle(ctx: HandlerContext): Promise<HandlerResult> {
        const msg: SlackMessage = {
            text: `It's me, \`${this.name}/${this.version}\`! I'm now running!`,
        };
        return ctx.messageClient.send(msg, addressSlackUsers(ctx.source.slack.team.id, this.owner));
    }
}
