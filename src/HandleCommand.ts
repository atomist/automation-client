
import { HandlerContext } from "./HandlerContext";
import { HandlerResult } from "./HandlerResult";

/**
 * Interface for command handlers.
 */
export interface HandleCommand {

    /**
     * Handle the given command. Parameters will have been set on the object
     * @param {HandlerContext} ctx context from which GraphQL client can be obtained
     * @return {Promise<HandlerResult>} result containing status and any command-specific data
     */
    handle(ctx: HandlerContext): Promise<HandlerResult>;
}
