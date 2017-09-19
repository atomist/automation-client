/**
 * Convenient function to return a success result if we are able to send messages
 * recorded in context MessageClient
 * @param ctx handler context
 * @return {Promise<TResult2|{code: number}>}
 */

import { HandlerContext } from "../../HandlerContext";
import { HandlerResult } from "../../HandlerResult";

export function sendMessages(ctx: HandlerContext): Promise<HandlerResult> {
    return ctx.messageClient.flush()
        .then(_ => {
            return {code: 0};
        });
}
