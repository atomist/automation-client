import { logger } from "../../src/internal/util/logger";

import { SlackMessage } from "@atomist/slack-messages/SlackMessages";
import { CommandHandler, Parameter, Secret } from "../../src/decorators";
import { HandleCommand, HandlerContext, HandlerResult, Secrets } from "../../src/Handlers";
import { sendMessages } from "../../src/operations/support/contextUtils";
import { buttonForCommand, menuForCommand } from "../../src/spi/message/MessageClient";
import { CommandHandlerMetadata } from "../../src/internal/metadata/metadata";

export class PlainHelloWorld implements HandleCommand, CommandHandlerMetadata {
//                                                     ^ -- implementing that interface is totally optional and only
//                                                          useful for getting type checking from the compiler

    public description = "Sends a hello back to the client";
    public intent = [ "hello world" ];
    public parameters = [ { name: "name", pattern: "^.*$", required: true } ];
    public secrets = [ { name: "userToken", path: Secrets.USER_TOKEN } ];

    public name: string;

    public userToken: string;

    public handle(ctx: HandlerContext): Promise<HandlerResult> {
        throw new Error("Not relevant");
    }
}
