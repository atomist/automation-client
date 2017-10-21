
import { HandlerContext } from "../../HandlerContext";
import { HandlerResult, Success } from "../../HandlerResult";

/**
 * Convenient function to return a success result if we are able to send messages
 * recorded in context MessageClient
 * @param ctx handler context
 */
export function sendMessages(ctx: HandlerContext): Promise<HandlerResult> {
    return ctx.messageClient.flush()
        .then(succeed);
}

/**
 * Can throw this into the end of a handler chain to return a HandlerResult
 * @param whatever
 * @return {Promise<HandlerResult>}
 */
export function succeed(whatever: any): Promise<HandlerResult> {
    return Promise.resolve(Success);
}
