import { HandlerContext, HandlerResult } from "./index";
import { Arg, Secret } from "./internal/invoker/Payload";
import { OnEvent } from "./onEvent";

export interface EventFired<T> {

    data: T;
    extensions: {
        operationName: string;
    };
    secrets?: Secret[];
}

/**
 * Handle the given event. Parameters will have been set on the object
 * @param {HandlerContext} ctx context from which GraphQL client can be obtained if it's
 * necessary to run further queries.
 * @return {Promise<HandlerResult>} result containing status and any command-specific data
 */
export interface HandleEvent<T> {

    handle: OnEvent<T>;
}
