import { configurationValue } from "../configuration";

function concurrentDefault(): number {
    return configurationValue<number>("pool.concurrent", 5);
}

/**
 * Execute all provided promises with a max concurrency
 * Results will be in the same order as the provided promises; if a promise
 * rejects, the result will contain the error instead
 * @param promises all promises to execute
 * @param concurrent the max number of concurrent promise executions
 */
export async function executeAll<T>(promises: Array<Promise<T>>, concurrent: number = concurrentDefault()): Promise<T[]> {
    let index = 0;
    const producer = () => {
        if (index < promises.length) {
            const promise = promises[index];
            index++;
            return promise;
        } else {
            return null;
        }
    };

    const PromisePool = require("es6-promise-pool");
    const pool = new PromisePool(producer, concurrent);

    const results: T[] = [];
    pool.addEventListener("fulfilled", (event: any) => {
        results[promises.indexOf(event.data.promise)] = event.data.result;
    });
    pool.addEventListener("rejected", (event: any) => {
        results[promises.indexOf(event.data.promise)] = event.data.error;
    });

    await pool.start(); // start only returns a promise; not an [] of results

    return results;
}
