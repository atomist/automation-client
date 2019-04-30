import {
    ConfigurableCommandHandler,
    MappedParameter,
    MappedParameters,
    Parameter,
} from "../../lib/decorators";
import { HandleCommand } from "../../lib/HandleCommand";
import {
    ConfigurationAware,
    HandlerContext,
} from "../../lib/HandlerContext";
import {
    failure,
    HandlerResult,
    Success,
} from "../../lib/HandlerResult";
import {
    addressEvent,
    addressSlackChannels,
    addressSlackUsers,
    addressSlackUsersFromContext,
} from "../../lib/spi/message/MessageClient";
import { logger } from "../../lib/util/logger";
import { SecretBaseHandler } from "./SecretBaseHandler";

@ConfigurableCommandHandler("Send a hello back to the client", { intent: "hello cd", autoSubmit: true })
export class HelloWorld extends SecretBaseHandler implements HandleCommand {

    @Parameter({ description: "Name of person the greeting should be send to", pattern: /^.*$/, control: "textarea" })
    public name: string;

    @MappedParameter(MappedParameters.SlackUserName)
    public sender: string;

    public async handle(ctx: HandlerContext): Promise<HandlerResult> {

        const conf = (ctx as any as ConfigurationAware).configuration;

        const helloWorld = {
            sender: {
                name: this.sender,
            },
            recipient: {
                name: this.name,
            },
        };


        logger.info(" hello look bla bla https://test:superpassword@google.com test");

        await ctx.messageClient.send({ text: "https://test:superpassword@google.com"}, await addressSlackUsersFromContext(ctx, "cd"), { thread: true });

        await ctx.messageClient.send({ text: "test" }, addressSlackChannels(ctx.workspaceId, "handlers"));
        await ctx.messageClient.send({ text: "test" }, addressSlackUsers(ctx.workspaceId, "cd"), { id: null });

        return ctx.messageClient.send(helloWorld, addressEvent("HelloWorld"))
            .then(result => {
                // result.bla.bla;
                return Success;
            })
            .catch(failure);

    }
}
