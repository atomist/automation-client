import {
    bold,
    SlackMessage,
} from "@atomist/slack-messages";
import {
    CommandHandler,
    Parameter,
} from "../../src/decorators";
import { HandleCommand } from "../../src/HandleCommand";
import { HandlerContext } from "../../src/HandlerContext";
import {
    failure,
    HandlerResult,
    Success,
} from "../../src/HandlerResult";
import { guid } from "../../src/internal/util/string";
import { buttonForCommand } from "../../src/spi/message/MessageClient";

@CommandHandler("Handler to test different types of messages", "message_test")
export class MessageTest implements HandleCommand {

    @Parameter({description: "message type"})
    public type: "ttl" | "always" | "update_only";

    @Parameter({description: "message type", required: false, displayable: false})
    public msgId: string;

    public handle(ctx: HandlerContext): Promise<HandlerResult> {
        if (!this.msgId) {
            this.msgId = guid();
        }
        const msg: SlackMessage = {
            text: `Selected ${bold(this.type || "none")}`,
            attachments: [{
                fallback: "Actions",
                actions: [
                    buttonForCommand(
                        {text: "ttl 10s"}, "MessageTest", {type: "ttl", msgId: this.msgId }),
                    buttonForCommand(
                        {text: "always"}, "MessageTest", {type: "always", msgId: this.msgId }),
                    buttonForCommand(
                        {text: "update"}, "MessageTest", {type: "update_only", msgId: this.msgId }),
                ],
            }],
        };

        if (this.type === "ttl") {
            return ctx.messageClient.respond(msg, { id: this.msgId, ttl: 1000 * 10 })
                .then(() => Success, failure);
        } else if (this.type === "always") {
            return ctx.messageClient.respond(msg, { id: this.msgId, post: "always" })
                .then(() => Success, failure);
        } else if (this.type === "update_only") {
            return ctx.messageClient.respond(msg, { id: this.msgId, post: "update_only" })
                .then(() => Success, failure);
        } else {
            return ctx.messageClient.respond(msg, { id: this.msgId })
                .then(() => Success, failure);
        }
    }
}
