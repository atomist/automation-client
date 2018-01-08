import {
    HandlerResult,
    Success,
} from "../../HandlerResult";

/**
 * Can throw this into the end of a handler chain to return a HandlerResult
 * @param whatever
 * @return {Promise<HandlerResult>}
 */
export function succeed(whatever: any): Promise<HandlerResult> {
    return Promise.resolve(Success);
}
