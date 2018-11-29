import promiseRetry = require("promise-retry");
import { WrapOptions } from "retry";

import { logger } from "./logger";

/**
 * Default retry options for doWithRetry.
 */
export const DefaultRetryOptions: RetryOptions = {
    retries: 5,
    factor: 3,
    minTimeout: 1 * 500,
    maxTimeout: 5 * 1000,
    randomize: true,
    log: true,
};

export interface RetryOptions extends WrapOptions {
    log?: boolean;
}

/**
 * Generic typed retry support
 * Perform the task, retrying according to the retry options
 * @param {() => Promise<R>} what
 * @param {string} description
 * @param {Object} opts
 * @return {Promise<R>}
 */
export function doWithRetry<R>(what: () => Promise<R>,
                               description: string,
                               opts: RetryOptions = {}): Promise<R> {
    const retryOptions: WrapOptions = {
        ...DefaultRetryOptions as WrapOptions,
        ...opts,
    };
    if (opts.log) {
        logger.log("silly", `${description} with retry options '%j'`, retryOptions);
    }
    return promiseRetry(retryOptions, retry => {
        return what()
            .catch(err => {
                if (opts.log) {
                    logger.warn(`Error occurred attempting '${description}': ${err.message}`);
                }
                retry(err);
            });
    }) as Promise<R>;
}
