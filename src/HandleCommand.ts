import { HandlerContext } from "./HandlerContext";
import { HandlerResult } from "./HandlerResult";
import { CommandHandlerMetadata } from "./internal/metadata/metadata";

// tslint:disable-next-line:interface-over-type-literal
export type Parameters = {};

/**
 * Interface for class-based command handlers.
 */
export interface HandleCommand<P = any> {

    /**
     * Handle the given command. Parameters will have been set on the object
     * if it's a class, and will also be available in the params object.
     * @param {HandlerContext} ctx context from which GraphQL client can be obtained
     * @param params parameters to the command
     * @return {Promise<HandlerResult>} result containing status and any command-specific data
     */
    handle(ctx: HandlerContext, params: P): Promise<HandlerResult>;
}

export type SelfDescribingHandleCommand<P> = HandleCommand<P> & CommandHandlerMetadata;
