import { HandlerContext } from "./HandlerContext";
import { HandlerResult } from "./HandlerResult";
import { Arg } from "./internal/invoker/Payload";

export interface EventFired<T> {

    data: T;
    extensions: {
        operationName: string;
    };
    secrets?: Arg[];
}

/**
 * Handle the given event. Parameters will have been set on the object
 * @param {HandlerContext} ctx context from which GraphQL client can be obtained if it's
 * necessary to run further queries.
 * @return {Promise<HandlerResult>} result containing status and any command-specific data
 */
export interface HandleEvent<T> {

    handle(e: EventFired<T>, ctx: HandlerContext): Promise<HandlerResult>;
}
