import { Secrets } from "../../lib/decorators";
import { HandleCommand } from "../../lib/HandleCommand";
import { HandlerContext } from "../../lib/HandlerContext";
import { HandlerResult } from "../../lib/HandlerResult";
import { CommandHandlerMetadata } from "../../lib/metadata/automationMetadata";

export class PlainHelloWorld implements HandleCommand, CommandHandlerMetadata {
    //                                                     ^ -- implementing that interface is totally optional and only
    //                                                          useful for getting type checking from the compiler

    public description = "Sends a hello back to the client";
    public intent = ["hello world"];
    public parameters = [{
        name: "name",
        display_name: "Name", pattern: "^.*$", required: true, default_value: "Jim",
    }];
    public secrets = [{ name: "userToken", uri: Secrets.UserToken }];

    public name: string;

    public userToken: string;

    // Use "params" rather than "this" to get parameters and avoid scoping issues!
    public handle(ctx: HandlerContext, params: this): Promise<HandlerResult> {
        throw new Error("Not relevant");
    }
}
