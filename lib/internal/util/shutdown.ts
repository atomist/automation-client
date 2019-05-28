import * as exitHook from "async-exit-hook";
import { get as _get } from "lodash";
import { Configuration } from "../../configuration";
import { automationClientInstance } from "../../globals";
import { logger } from "../../util/logger";

/** Believe or not, this is the default grace period. */
export const defaultGracePeriod = 10000;

/**
 * Return whether graceful termination is enabled.
 */
export function terminationGraceful(cfg: Configuration): boolean {
    return _get(cfg, "ws.termination.graceful", false);
}

/**
 * Return graceful termination period in milliseconds.
 */
export function terminationGracePeriod(cfg: Configuration): number {
    return _get(cfg, "ws.termination.gracePeriod", defaultGracePeriod);
}

/**
 * Shutdown hook function and metadata.
 */
export interface ShutdownHook {
    /** Function to call at shutdown. */
    hook: () => Promise<number>;
    /**
     * Priority of hook.  Lower number values are executed first.  The
     * number provided should be greater than 0 and less 100000.
     * Using a priority outside (0, 100000) may interfere with
     * internal shutdown behaviors.
     */
    priority: number;
    /** Optional description used in logging. */
    description?: string;
}

let shutdownHooks: ShutdownHook[] = [];

/**
 * Add callback to run when shutdown is initiated prior to process
 * exit.  See [[ShutdownHook]] for description of parameters.
 */
export function registerShutdownHook(cb: () => Promise<number>, priority: number = 1000, desc?: string): void {
    const description = desc || `Shutdown hook with priority ${priority}`;
    shutdownHooks = [{ priority, hook: cb, description }, ...shutdownHooks].sort((h1, h2) => h1.priority - h2.priority);
}

/**
 * Run each shutdown hook and collect its result.
 */
export async function executeShutdownHooks(cb: () => never): Promise<never> {
    if (shutdownHooks.length === 0) {
        logger.info("Shutting down");
        cb();
        throw new Error(`async-exit-hook callback returned but should not have`);
    }

    logger.info("Shutdown initiated, calling shutdown hooks");
    let status = 0;
    for (const hook of shutdownHooks) {
        try {
            logger.debug(`Calling shutdown hook '${hook.description}'...`);
            const result = await hook.hook();
            logger.debug(`Shutdown hook '${hook.description}' completed with status '${result}'`);
            status += result;
        } catch (e) {
            logger.warn(`Shutdown hook '${hook.description}' threw an error: ${e.message}`);
            status += 10;
        }
    }
    logger.info(`Shutdown hooks completed with status '${status}', exiting`);
    shutdownHooks = [];
    cb();
    throw new Error(`async-exit-hook callback returned but should not have`);
}
exitHook(executeShutdownHooks);

/**
 * Set the absolute longest number of milliseconds shutdown should
 * take.
 */
export function setForceExitTimeout(ms: number): void {
    exitHook.forceExitTimeout(ms);
}

/**
 * Register a final shutdown hook that calls `process.exit(code)` and
 * then initiates shutdown.  This allows you to exit with a specific
 * exit code _and_ process all async shutdown hooks, something not
 * possible when calling process.exit directly.
 *
 * For the fastest safe exit, set the automation client configuration
 * ws.termination.graceful to false before calling this.
 *
 * @param code Exit code
 */
export function safeExit(code: number): void {
    registerShutdownHook(async () => {
        process.exit(code);
        return 0; // make the compiler happy
    }, Number.MAX_VALUE);
    process.kill(process.pid);
}
