import {
    ConfigurableCommandHandler,
    MappedParameter,
    MappedParameters,
    Parameter,
    Value,
} from "../../src/decorators";
import { HandleCommand } from "../../src/HandleCommand";
import { HandlerContext } from "../../src/HandlerContext";
import {
    failure,
    HandlerResult,
    success,
} from "../../src/HandlerResult";
import { addressEvent } from "../../src/spi/message/MessageClient";
import { SecretBaseHandler } from "./SecretBaseHandler";

@ConfigurableCommandHandler("Send a hello back to the client", { intent: "hello cd", autoSubmit: true })
export class HelloWorld extends SecretBaseHandler implements HandleCommand {

    @Parameter({ description: "Name of person the greeting should be send to", pattern: /^.*$/, control: "textarea" })
    public name: string;

    @MappedParameter(MappedParameters.SlackUserName)
    public sender: string;

    public handle(ctx: HandlerContext): Promise<HandlerResult> {

        const helloWorld = {
            sender: {
                name: this.sender,
            },
            recipient: {
                name: this.name,
            },
        };

        return ctx.messageClient.send(helloWorld, addressEvent("HelloWorld"))
            .then(success, failure);

    }
}
