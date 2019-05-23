import {
    ConfigurableCommandHandler,
    MappedParameter,
    MappedParameters,
    Parameter,
} from "../../lib/decorators";
import { HandleCommand } from "../../lib/HandleCommand";
import { HandlerContext } from "../../lib/HandlerContext";
import {
    HandlerResult,
    Success,
} from "../../lib/HandlerResult";
import { addressSlackUsersFromContext } from "../../lib/spi/message/MessageClient";
import { SecretBaseHandler } from "./SecretBaseHandler";

@ConfigurableCommandHandler("Send a hello back to the client", { intent: "hello cd", autoSubmit: true })
export class HelloWorld extends SecretBaseHandler implements HandleCommand {

    @Parameter({ description: "Name of person the greeting should be send to", pattern: /^.*$/, control: "textarea" })
    public name: string;

    @MappedParameter(MappedParameters.SlackUserName)
    public sender: string;

    public async handle(ctx: HandlerContext): Promise<HandlerResult> {

        await ctx.messageClient.send(
            { text: "https://test:superpassword@google.com" }, await addressSlackUsersFromContext(ctx, "cd"),
            {
                id: "test",
            });

        await ctx.messageClient.delete(
            await addressSlackUsersFromContext(ctx, "cd"),
            { id: "test" });

        return Success;
    }
}
