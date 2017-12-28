import * as exitHook from "async-exit-hook";
import { logger } from "./logger";

const shutdownHooks: Array<() => Promise<number>> = [];

export function registerShutdownHook(cb: () => Promise<number>) {
    shutdownHooks.push(cb);
}

exitHook.forceExitTimeout(60000 * 2);
exitHook(callback => {
    logger.info("Shutdown initiated. Calling shutdown hooks");
    shutdownHooks.reduce((p, c, i, result) => p.then(c), Promise.resolve(0))
        .then(result => {
            logger.info("Shutdown hooks completed. Exiting...");
            callback();
            process.exit(result);
        })
        .catch(() => {
            logger.info("Shutdown hooks failed. Exiting...");
            callback();
            process.exit(1);
        });
});
