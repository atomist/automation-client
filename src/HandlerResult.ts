/*
 * Copyright © 2018 Atomist, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Result of a handler. Can be extended to include further,
 * command-specific, data
 */
export interface HandlerResult {
    /**
     * 0 is success
     */
    code: number;

    /**
     * The simple text message describing the result
     */
    message?: string;
}

/**
 * The result of a command invocation returns a redirect URL that can be
 * presented to the invoker of the command in different ways: eg. HTTP redirect
 * or a slack message with the link.
 */
export interface RedirectResult extends HandlerResult {

    /**
     * The redirect url
     */
    redirect: string;
}

/**
 * Handler result for failing handler.
 */
export interface HandlerError extends HandlerResult {

    /**
     * The stack trace of the error
     */
    stack?: any;
}

/**
 * Default success result.
 */
export const Success: HandlerResult = {
    code: 0,
};

/**
 * Default success result wrapped in a promise.
 */
export const SuccessPromise = Promise.resolve(Success);

/**
 * Default failure result.
 */
export const Failure: HandlerResult = {
    code: 1,
};

/**
 * Default failure result wrapped in a promise.
 */
export const FailurePromise = Promise.resolve(Failure);

/**
 * Function that returns a handler failure result.
 */
export function failure(err: Error): HandlerError {
    return { code: 1, message: err.message, stack: err.stack };
}

/**
 * Function that returns a handler success result.
 */
export function success(): HandlerResult {
    return Success;
}

/**
 * Combine an array of HandlerResults into a single HandlerResult.
 * Each HandlerResult.code is summed into the final, single value and
 * messages are concatenated, separated by a semicolon (;).  Useful to
 * combine the return value from calling Promise.all on the array of
 * events sent to an event handler.
 *
 * @param results array of HandlerResults
 * @return single, combined result
 */
export function reduceResults(results: HandlerResult[]): HandlerResult {
    return results.reduce((acc, cur) => {
        return {
            code: acc.code + cur.code,
            message: (cur.message) ? ((acc.message) ? `${acc.message}; ${cur.message}` : cur.message) : acc.message,
        };
    }, Success);
}
