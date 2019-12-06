import * as appRoot from "app-root-path";
import * as fs from "fs";
import * as os from "os";
import { logger } from "../../util/logger";
import { broadcast } from "../transport/cluster/messages";

let DataDirectory = `${appRoot.path}/heap`;

/**
 * Initialise memory monitoring. This is will set the data directory for heap dumps and
 * print the head usage to the console every 60 seconds.
 * @param {string} dataDirectory
 */
export function initMemoryMonitoring(dataDirectory: string = `${appRoot.path}/heap`, log: boolean = true) {
    logger.debug("Initialising memory monitoring");
    DataDirectory = dataDirectory;

    if (log) {
        setInterval(() => {
            logger.debug("Memory statistics '%j'", memoryUsage());
        }, 60000);
    }
}

/**
 * Create a head dump that can be downloaded and used to profile head usage.
 * @returns {string}
 */
export function mtrace(): string {
    try {
        logger.debug("Memory statistics '%j'", memoryUsage());
        const mtrace = require("mtrace");
        gc();
        const filename = mtrace.mtrace();
        if (!!filename) {
            logger.debug("mtrace dump written to '%s'", filename);
        } else {
            logger.warn("mtrace not supported");
        }
        broadcast({ type: "atomist:gc" });
        broadcast({ type: "atomist:mtrace" });
        return name;
    } catch (err) {
        logger.error("Failed to initialise mtrace. Required 'mtrace' module is missing or can't be" +
            " loaded. Please install with 'npm install --save mtrace'");
    }
}

/**
 * Create a head dump that can be downloaded and used to profile head usage.
 * @returns {string}
 */
export function heapDump(): string {
    try {
        logger.debug("Memory statistics '%j'", memoryUsage());
        // tslint:disable-next-line:no-implicit-dependencies
        const heapdump = require("heapdump");
        const name = `heapdump-${process.pid}-${Date.now()}.heapsnapshot`;
        if (!fs.existsSync(DataDirectory)) {
            fs.mkdirSync(DataDirectory);
        }
        gc();
        heapdump.writeSnapshot(`${DataDirectory}/${name}`, (err, filename) => {
            logger.debug("Heap dump written to '%s'", filename);
        });
        broadcast({ type: "atomist:gc" });
        broadcast({ type: "atomist:heapdump" });
        return name;
    } catch (err) {
        logger.error("Failed to initialise memory monitoring. Required 'heapdump' module is missing or can't be" +
            " loaded. Please install with 'npm install --save heapdump'");
    }
}

/**
 * Get some memory statistics.
 * @returns {{heap: {rss: string; total: string; used: string}; memory: {free: string; total: string}; up_time: string}}
 */
export function memoryUsage() {
    const mem = process.memoryUsage();
    const usage = {
        heap: {
            rss: (mem.rss / 1024 / 1024).toFixed(2),
            total: (mem.heapTotal / 1024 / 1024).toFixed(2),
            used: (mem.heapUsed / 1024 / 1024).toFixed(2),
        },
        memory: {
            free: (os.freemem() / 1024 / 1024).toFixed(2),
            total: (os.totalmem() / 1024 / 1024).toFixed(2),
        },
        up_time: formatMillis(process.uptime() * 1000),
    };
    return usage;
}

/**
 * Trigger gargabe collect.
 * This required the process to run with --expose_gc.
 */
export function gc() {
    if (global.gc) {
        logger.debug("Triggering GC");
        global.gc();
        logger.debug("Memory statistics: %j", memoryUsage());
        broadcast({ type: "atomist:gc" });
    }
}

function formatMillis(millis: number): string {
    const date = new Date(millis);
    let str = "";
    if (date.getUTCDate() > 1) {
        str += date.getUTCDate() - 1 + " d, ";
    }
    if (date.getUTCHours() > 0) {
        str += date.getUTCHours() + " hr, ";
    }
    if (date.getUTCMinutes() > 0) {
        str += date.getUTCMinutes() + " min, ";
    }
    str += date.getUTCSeconds() + " s";
    return str;
}
