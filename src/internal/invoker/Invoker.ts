import { EventFired } from "../../HandleEvent";
import { HandlerContext } from "../../HandlerContext";
import { HandlerResult } from "../../HandlerResult";
import { CommandHandlerMetadata } from "../../metadata/automationMetadata";
import { CommandInvocation } from "./Payload";

export interface Invoker {

    /**
     * Validate the invocation. Does the command exist on this serve?
     * Are the parameters valid?
     * @param payload
     * @return metadata if the command is valid. Otherwise throw an Error
     */
    validateCommandInvocation(payload: CommandInvocation): CommandHandlerMetadata;

    invokeCommand(payload: CommandInvocation, ctx: HandlerContext): Promise<HandlerResult>;

    onEvent(payload: EventFired<any>, ctx: HandlerContext): Promise<HandlerResult[]>;
}
