import { CommandHandler } from "../../src/decorators";
import { HandleCommand } from "../../src/HandleCommand";
import { HandlerContext } from "../../src/HandlerContext";
import {
    failure,
    HandlerResult,
    success,
} from "../../src/HandlerResult";
import { SlackFileMessage } from "../../src/spi/message/MessageClient";

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
