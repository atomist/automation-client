import { HandlerContext } from "./HandlerContext";
import { HandlerResult } from "./HandlerResult";
import { Secret } from "./internal/invoker/Payload";
import { EventHandlerMetadata } from "./metadata/automationMetadata";
import { OnEvent } from "./onEvent";

export interface EventFired<T = any> {

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
export interface HandleEvent<T = any, P = any> {

    handle: OnEvent<T, P>;

}

export type SelfDescribingHandleEvent<T = any, P = any> = HandleEvent<T, P> & EventHandlerMetadata;
