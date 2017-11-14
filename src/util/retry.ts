import * as promiseRetry from "promise-retry";

import { logger } from "../internal/util/logger";

export interface RetryOptions {

    retries: number;
    factor: number;
    minTimeout: number;
    maxTimeout: number;
    randomize: boolean;
}

const DefaultRetryOptions: RetryOptions = {
    retries: 5,
    factor: 3,
    minTimeout: 1 * 500,
    maxTimeout: 5 * 1000,
    randomize: true,
};

/**
 * Generic typed retry support
 * Perform the task, retrying according to the retry options
 * @param {() => Promise<R>} what
 * @param {string} description
 * @param {Object} opts
 * @return {Promise<R>}
 */
export function doWithRetry<R>(what: () => Promise<R>, description: string,
                               opts: Partial<RetryOptions> = {}): Promise<R> {
    const retryOptions: RetryOptions = {
        ...DefaultRetryOptions,
        ...opts,
    };
    logger.debug(`${description} with retry options '%j'`, retryOptions);
    return promiseRetry(retryOptions, retry => {
        return what()
            .catch(err => {
                logger.warn(`Error occurred attempting '${description}'. '${err.message}'`);
                retry(err);
            });
    });
}
