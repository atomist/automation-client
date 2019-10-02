import { configurationValue } from "../configuration";

function concurrentDefault(): number {
    return configurationValue<number>("pool.concurrent", 5);
}

/**
 * Execute all provided promises with a max concurrency
 * Results will be in the same order as the provided promises; if one promise rejects,
 * execution is stopped and the returned promise is rejected as well.
 * @param promises all promises to execute
 * @param concurrent the max number of concurrent promise executions
 */
export async function executeAll<T>(promises: Array<() => Promise<T>>,
                                    concurrent: number = concurrentDefault()): Promise<T[]> {
    let index = 0;
    const results: any[] = [];
    const producer = () => {
        if (index < promises.length) {
            const promise = promises[index]();
            results[index] = promise;
            index++;
            return promise;
        } else {
            // tslint:disable-next-line:no-null-keyword
            return null;
        }
    };

    const PromisePool = require("es6-promise-pool");
    const pool = new PromisePool(producer, concurrent);

    pool.addEventListener("fulfilled", (event: any) => {
        results[results.indexOf(event.data.promise)] = event.data.result;
    });

    await pool.start(); // start only returns a promise; not an [] of results

    return results;
}
