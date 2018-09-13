import { CommandHandler } from "../../lib/decorators";
import { HandleCommand } from "../../lib/HandleCommand";
import { HandlerContext } from "../../lib/HandlerContext";
import {
    failure,
    HandlerResult,
    success,
} from "../../lib/HandlerResult";
import { SlackFileMessage } from "../../lib/spi/message/MessageClient";

@CommandHandler("Handler to test different types of messages", "file_message_test")
export class FileMessageTest implements HandleCommand {

    public handle(ctx: HandlerContext): Promise<HandlerResult> {
        const msg: SlackFileMessage = {
            content: JSON.stringify({test: "bla", bla: "test"}),
            fileType: "javascript",
            fileName: "bla.json",
            comment: "Some clever comment",
        };

        return ctx.messageClient.respond(msg).
            then(success, failure);
    }
}
