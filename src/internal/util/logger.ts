import * as cluster from "cluster";
import * as fs from "fs-extra";
import * as _ from "lodash";
import * as logform from "logform";
import * as os from "os";
import * as p from "path";
import * as serializeError from "serialize-error";
import * as winston from "winston";
import { Configuration } from "../../configuration";
import * as context from "./cls";

const winstonLogger = winston.createLogger({
    level: "debug",
    exitOnError: false,
    silent: true,
});

/**
 * Global logger instance
 * By default all logging to this logger will be suppressed.
 * Call configureLogging to set up console and file transports.
 */
export const logger: Logger = winstonLogger;

// Save console log methods
const GlobalConsoleMethods = {
    error: console.error,
    warn: console.warn,
    info: console.info,
    debug: console.debug,
    log: console.log,
    trace: console.trace,
};

/**
 * Constants for the logging format
 */
export enum LoggingFormat {
    /**
     * Print only the message provided to the logger methods
     */
    None,
    /**
     * Print level and message
     */
    Simple,
    /**
     * Print the full client related metadata
     */
    Full,
}

/**
 * Configuration for the logging sub-system to be passed to configureLogging
 */
export interface LoggingConfiguration {
    console: {
        /**
         * Enable logging to console
         */
        enabled: boolean,
        /**
         * Set log level for the console
         */
        level?: string,
        /**
         * Set format of console log
         */
        format?: LoggingFormat,
        /**
         * Redirect console.log methods to logger sub-system
         */
        redirect?: boolean,
    };
    file: {
        /**
         * Enable file logging
         */
        enabled: boolean,
        /**
         * Set log level for file logging
         */
        level?: string,
        /**
         * Set file name and path to log into
         */
        filename?: string,
        /**
         * Set format for file logging
         */
        format?: LoggingFormat,
    };
}

/**
 * Logging configuration to simply pass through log message to the console
 */
export const NoLoggingConfiguration: LoggingConfiguration = {
    console: {
        enabled: true,
        level: "info",
        format: LoggingFormat.None,
        redirect: false,
    },
    file: {
        enabled: false,
    },
};

/**
 * CLI-style logging configuration
 */
export const MinimalLoggingConfiguration: LoggingConfiguration = {
    console: {
        enabled: true,
        level: "info",
        format: LoggingFormat.Simple,
        redirect: false,
    },
    file: {
        enabled: false,
    },
};

/**
 * Default logging configuration for running automation clients
 */
export const DefaultClientLoggingConfiguration: LoggingConfiguration = {
    console: {
        enabled: true,
        level: "info",
        format: LoggingFormat.Full,
        redirect: true,
    },
    file: {
        enabled: false,
    },
};

/**
 * Configure the logging sub-system with the provided LoggingConfiguration
 * It is safe to call this method several times to re-configure the logger.
 * @param config
 */
export function configureLogging(config: LoggingConfiguration) {
    winstonLogger.silent = true;
    winstonLogger.clear();

    // Set up console logging
    if (config.console.enabled === true) {
        const ct = new winston.transports.Console({
            level: config.console.level || "info",
            format: getFormat(config.console.format),
        });
        winstonLogger.add(ct);

        if (config.console.redirect === true) {
            redirectConsoleLogging();
        } else {
            unRedirectConsoleLogging();
        }

        winstonLogger.silent = false;
    }

    // Set up file logging
    if (config.file.enabled) {

        let filename = config.file.filename;

        if (!filename) {
            const appDir = __dirname.split(p.join("node_modules", "@atomist", "automation-client"))[0];
            let pj: { name: string; };
            try {
                pj = require(p.join(appDir, "package.json"));
            } catch (e) {
                pj = { name: "atm-client" };
            }
            filename = p.join(
                os.homedir(),
                ".atomist",
                "log",
                `${pj.name.replace(/^.*\//, "")}-local.log`);
        }

        const path = p.resolve(filename);
        fs.mkdirsSync(p.dirname(path));

        const ft = new winston.transports.File({
            filename: p.basename(path),
            dirname: p.dirname(path),
            level: config.file.level || config.console.level,
            maxsize: 10 * 1024 * 1024,
            maxFiles: 10,
            tailable: true,
            // zippedArchive: true, // see https://github.com/winstonjs/winston/issues/1128
            format: winston.format.combine(
                getFormat(config.file.format),
                winston.format.uncolorize(),
            ),
        });
        winstonLogger.add(ft);
        winstonLogger.silent = false;
    }
}

/**
 * Configure the logging sub-system based on the provided Configuration object
 * @param configuration
 */
export function clientLoggingConfiguration(configuration: Configuration): LoggingConfiguration {
    const lc: LoggingConfiguration = {
        ...DefaultClientLoggingConfiguration,
    };
    if (configuration.logging) {
        if (configuration.logging.level) {
            lc.console.enabled = true,
                lc.console.level = configuration.logging.level;
            lc.console.format = LoggingFormat.Full;
        }
        if (configuration.logging.file) {
            if (configuration.logging.file.enabled === true) {
                let filename = p.join(".", "log", `${configuration.name.replace(/^.*\//, "")}.log`);
                if (configuration.logging.file.name) {
                    filename = this.configuration.logging.file.name;
                }
                lc.file = {
                    enabled: true,
                    level: configuration.logging.file.level || configuration.logging.level,
                    filename,
                    format: LoggingFormat.Full,
                };
            }
        }
    }
    return lc;
}

const clientFormat = info => {
    const c = winston.format.colorize();
    const executionContext = context.get();
    let ctx: string;
    if (cluster.isMaster) {
        ctx = c.colorize(info.level, "m");
    } else {
        ctx = c.colorize(info.level, "w");
    }
    ctx += ":" + c.colorize(info.level, process.pid.toString());
    if (executionContext) {
        if (executionContext.invocationId) {
            ctx += ":" + c.colorize(info.level, executionContext.invocationId);
        }
        if (executionContext.workspaceName) {
            ctx += ":" + c.colorize(info.level, executionContext.workspaceName);
        } else if (executionContext.workspaceId) {
            ctx += ":" + c.colorize(info.level, executionContext.workspaceId);
        }
        if (executionContext.operation) {
            ctx += ":" + c.colorize(info.level, executionContext.operation);
        }
        if (executionContext.ts) {
            const duration = _.padStart((Date.now() - executionContext.ts).toString(), 3, "0");
            ctx += ":" + c.colorize(info.level, duration);
        }
    }

    const level = c.colorize(info.level, _.padEnd(info.level, 5));

    const formatted = info.timestamp + (ctx ? " [" + ctx + "]" : "")
        + " [" + level + "] " + (info.message ? info.message : "");

    return formatted;
};

function unRedirectConsoleLogging() {
    console.error = GlobalConsoleMethods.error;
    console.info = GlobalConsoleMethods.info;
    console.log = GlobalConsoleMethods.log;
    console.trace = GlobalConsoleMethods.trace;
    console.warn = GlobalConsoleMethods.warn;
}

function redirectConsoleLogging() {
    console.error = (message?: any, ...optionalParams: any[]) => {
        winstonLogger.error(message, ...optionalParams);
    };
    console.info = (message?: any, ...optionalParams: any[]) => {
        winstonLogger.info(message, ...optionalParams);
    };
    console.log = (message?: any, ...optionalParams: any[]) => {
        winstonLogger.info(message, ...optionalParams);
    };
    console.trace = (message?: any, ...optionalParams: any[]) => {
        winstonLogger.debug(message, ...optionalParams);
    };
    console.warn = (message?: any, ...optionalParams: any[]) => {
        winstonLogger.warn(message, ...optionalParams);
    };
}

function getFormat(format: LoggingFormat): logform.Format {
    switch (format) {
        case LoggingFormat.Full:
            return winston.format.combine(
                winston.format.timestamp(),
                winston.format.splat(),
                winston.format.printf(clientFormat),
            );
        case LoggingFormat.Simple:
            return winston.format.combine(
                winston.format.colorize(),
                winston.format.splat(),
                winston.format.simple(),
            );
        case LoggingFormat.None:
        default:
            return winston.format.combine(
                winston.format.splat(),
                winston.format.printf(info => info.message),
            );
    }
}

process.on("uncaughtException", err => {
    logger.error(serializeError(err));
});

export interface Logger {
    log: LogMethod;

    error: LeveledLogMethod;
    warn: LeveledLogMethod;
    info: LeveledLogMethod;
    debug: LeveledLogMethod;
    verbose: LeveledLogMethod;
}

export interface LogMethod {
    (level: string, msg: string, callback: LogCallback): Logger;

    (level: string, msg: string, meta: any, callback: LogCallback): Logger;

    (level: string, msg: string, ...meta: any[]): Logger;
}

export interface LeveledLogMethod {
    (msg: string, callback: LogCallback): Logger;

    (msg: string, meta: any, callback: LogCallback): Logger;

    (msg: string, ...meta: any[]): Logger;
}

export type LogCallback = (error?: any, level?: string, msg?: string, meta?: any) => void;
