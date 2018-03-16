import { EventFired } from "./HandleEvent";
import { HandlerContext } from "./HandlerContext";
import { HandlerResult } from "./HandlerResult";

/**
 * Handle the given event.
 * @param e event we're matching on
 * @param {HandlerContext} ctx context from which GraphQL client can be obtained if it's
 * necessary to run further queries.
 * @param params secrets and mapped parameters are available through this
 * @return {Promise<HandlerResult>} result containing status and any command-specific data
 */
export type OnEvent<T, P = any> =
    (e: EventFired<T>, ctx: HandlerContext, params: P) => Promise<HandlerResult>;
