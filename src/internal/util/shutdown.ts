import * as exitHook from "async-exit-hook";
import { logger } from "./logger";

let shutdownHooks: Array<{priority: number, hook: () => Promise<number>}> = [];

export function registerShutdownHook(cb: () => Promise<number>, priority: number = Number.MAX_VALUE) {
    shutdownHooks = [{ priority, hook: cb }, ...shutdownHooks].sort((h1, h2) => h1.priority - h2.priority);
}

exitHook.forceExitTimeout(60000 * 2);
exitHook(callback => {
    logger.info("Shutdown initiated. Calling shutdown hooks");
    shutdownHooks
        .map(h => h.hook)
        .reduce((p, c, i, result) => p.then(c), Promise.resolve(0))
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
