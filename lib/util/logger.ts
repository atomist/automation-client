import * as appRoot from "app-root-path";
import * as cluster from "cluster";
import * as fs from "fs-extra";
import * as _ from "lodash";
import * as logform from "logform";
import * as os from "os";
import * as p from "path";
import * as serializeError from "serialize-error";
import * as trace from "stack-trace";
import * as winston from "winston";
import * as Transport from "winston-transport";
import { Configuration } from "../configuration";
import * as context from "../internal/util/cls";
import { redactLog } from "./redact";

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

/* tslint:disable:no-console */
// Save console log methods
const GlobalConsoleMethods = {
    error: console.error,
    warn: console.warn,
    info: console.info,
    debug: console.debug,
    log: console.log,
    trace: console.trace,
};
/* tslint:enable:no-console */

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
    custom?: Transport[];
    redact?: boolean;
    callsites?: boolean;
    color?: boolean,
}

/**
 * Logging configuration suppress all logger logging
 */
export const NoLogging: LoggingConfiguration = {
    console: {
        enabled: false,
    },
    file: {
        enabled: false,
    },
    redact: true,
    color: true,
};

/**
 * Logging configuration to simply pass through log message to the console
 */
export const PlainLogging: LoggingConfiguration = {
    console: {
        enabled: true,
        level: "info",
        format: LoggingFormat.None,
        redirect: false,
    },
    file: {
        enabled: false,
    },
    redact: true,
    color: true,
};

/**
 * CLI-style logging configuration
 */
export const MinimalLogging: LoggingConfiguration = {
    console: {
        enabled: true,
        level: "info",
        format: LoggingFormat.Simple,
        redirect: false,
    },
    file: {
        enabled: false,
    },
    redact: true,
    color: true,
};

/**
 * Default logging configuration for running automation clients
 */
export const ClientLogging: LoggingConfiguration = {
    console: {
        enabled: true,
        level: process.env.ATOMIST_CONFIG_LOGGING_LEVEL ? process.env.ATOMIST_CONFIG_LOGGING_LEVEL : "info",
        format: LoggingFormat.Full,
        redirect: true,
    },
    file: {
        enabled: false,
    },
    redact: true,
    color: true,
};

/**
 * Configure the logging sub-system with the provided LoggingConfiguration
 * It is safe to call this method several times to re-configure the logger.
 * @param config
 */
export function configureLogging(config: LoggingConfiguration): void {
    try {
        winstonLogger.silent = true;
        winstonLogger.clear();

        // Set up console logging
        if (config.console.enabled === true) {
            const ct = new winston.transports.Console({
                level: validateLevel(config.console.level || "info"),
                format: getFormat(config.console.format, config.redact, config.callsites, config.color),
            });

            if (config.console.redirect === true) {
                redirectConsoleLogging();
            } else {
                unRedirectConsoleLogging();
            }

            winstonLogger.add(ct);
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
                    `${pj.name.replace(/@/g, "").replace(/\//g, "_")}_local.log`);
            }

            const path = p.resolve(filename);
            fs.mkdirsSync(p.dirname(path));

            const ft = new winston.transports.File({
                filename: p.basename(path),
                dirname: p.dirname(path),
                level: validateLevel(config.file.level || config.console.level),
                maxsize: 10 * 1024 * 1024,
                maxFiles: 10,
                tailable: true,
                // zippedArchive: true, // see https://github.com/winstonjs/winston/issues/1128
                format: winston.format.combine(
                    getFormat(config.file.format, config.redact, config.callsites, config.color),
                    winston.format.uncolorize(),
                ),
            });

            winstonLogger.add(ft);
            winstonLogger.silent = false;
        }

        // Set up custom transports
        if (config.custom && config.custom.length > 0) {
            config.custom.forEach(t => winstonLogger.add(t));
            winstonLogger.silent = false;
        }
    } catch (e) {
        // If we catch an error during logging initialization, we have to play it
        // safe and write straight to stderr as logging might be silentest.
        process.stderr.write(`Error occurred during logging initialization: ${e.stack}`);
        throw e;
    }
}

/**
 * Configure the logging sub-system based on the provided Configuration object
 * @param configuration
 */
export function clientLoggingConfiguration(configuration: Configuration): LoggingConfiguration {
    const lc: LoggingConfiguration = {
        ...ClientLogging,
    };
    if (configuration.logging) {
        if (configuration.logging.level) {
            lc.console = {
                enabled: true,
                level: configuration.logging.level,
                format: LoggingFormat.Full,
            };
        }
        if (_.get(configuration, "logging.file.enabled") === true) {
            let filename = p.join(".", "log", `${configuration.name.replace(/@/g, "").replace(/\//g, "_")}.log`);
            if (configuration.logging.file.name) {
                filename = configuration.logging.file.name;
            }

            lc.file = {
                enabled: true,
                level: configuration.logging.file.level || configuration.logging.level,
                filename,
                format: LoggingFormat.Full,
            };
        }
        lc.custom = _.get(configuration, "logging.custom.transports");
        lc.callsites = _.get(configuration, "logging.callsite");
        lc.color = _.get(configuration, "logging.color");
    }
    lc.redact = configuration.redact.log;
    return lc;
}

function validateLevel(level: string): string {
    const levels = ["silly", "debug", "verbose", "info", "warn", "error"];
    if (!levels.includes(level)) {
        throw new Error(`Log level '${level}' is invalid. Only levels '${levels.join(", ")}' are allowed`);
    }
    return level;
}

export function callsite(logInfo: logform.TransformableInfo): logform.TransformableInfo {
    const oldLimit = Error.stackTraceLimit;
    try {
        Error.stackTraceLimit = Infinity;
        throw new Error();
    } catch (e) {
        const root = appRoot.path;
        const callsites = trace.parse(e).map(l => ({
            fileName: l.getFileName(),
            lineNumber: l.getLineNumber(),
        })).filter(cs => !!cs.fileName).reverse();
        const callsite = callsites[callsites.findIndex(cs => cs.fileName.includes("node_modules/winston")) - 1];
        if (!!callsite) {
            return {
                ...logInfo,
                callsite: {
                    ...callsite,
                    fileName: callsite.fileName.split(root)[1].slice(1),
                },
            };
        }
    } finally {
        Error.stackTraceLimit = oldLimit;
    }

    return logInfo;
}

/* tslint:disable:cyclomatic-complexity */
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

    let callsite;
    if (!!info.callsite) {
        callsite = ` [${c.colorize(info.level, info.callsite.fileName)}:${c.colorize(info.level, info.callsite.lineNumber || -1)}]`;
    }

    const level = c.colorize(info.level, _.padEnd(info.level, 5));

    let formatted = info.timestamp + (!!callsite ? callsite : "") + (!!ctx ? " [" + ctx + "]" : "")
        + " [" + level + "] " + (info.message ? info.message : "");

    if (info.meta) {
        const meta = info.meta;
        if (meta instanceof Error) {
            const err = meta;
            if (err.stack && err.stack.includes(err.message)) {
                formatted = `${formatted}${formatted.endsWith(":") ? " " : ": "}
${err.stack}`;
            } else if (err.stack) {
                formatted = `${formatted}${formatted.endsWith(":") ? " " : ": "}${err.message}
${err.stack}`;
            } else {
                formatted = `${formatted}${formatted.endsWith(":") ? " " : ": "}${err.message}`;
            }
        } else if (meta.stack) {
            if (meta.stack && meta.stack.includes(meta.message)) {
                formatted = `${formatted}${formatted.endsWith(":") ? " " : ": "}
${meta.stack}`;
            } else {
                formatted = `${formatted}${formatted.endsWith(":") ? " " : ": "}${meta.message ? meta.message : ""}
${meta.stack}`;
            }
        } else if (!(Array.isArray(meta) && meta.length === 0)) {
            formatted = `${formatted}${formatted.endsWith(":") ? " " : ": "}${JSON.stringify(serializeError(info.meta))}`;
        }
    }

    return formatted;
};
/* tslint:enable:cyclomatic-complexity */

/* tslint:disable:no-console */
function unRedirectConsoleLogging(): void {
    console.error = GlobalConsoleMethods.error;
    console.info = GlobalConsoleMethods.info;
    console.log = GlobalConsoleMethods.log;
    console.trace = GlobalConsoleMethods.trace;
    console.warn = GlobalConsoleMethods.warn;
}

function redirectConsoleLogging(): void {
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
/* tslint:enable:no-console */

function getFormat(format: LoggingFormat,
                   redact: boolean,
                   callsites: boolean,
                   color: boolean): logform.Format {
    switch (format) {
        case LoggingFormat.Full:
            return winston.format.combine(
                ...(redact ? [winston.format(redactLog)()] : []),
                winston.format.timestamp(),
                ...(callsites ? [winston.format(callsite)()] : []),
                winston.format.splat(),
                winston.format.printf(clientFormat),
                ...(color ? [] : [winston.format.uncolorize()]),
            );
        case LoggingFormat.Simple:
            return winston.format.combine(
                ...(redact ? [winston.format(redactLog)()] : []),
                winston.format.colorize(),
                winston.format.splat(),
                ...(callsites ? [winston.format(callsite)()] : []),
                winston.format.simple(),
                ...(color ? [] : [winston.format.uncolorize()]),
            );
        case LoggingFormat.None:
        default:
            return winston.format.combine(
                ...(redact ? [winston.format(redactLog)()] : []),
                winston.format.splat(),
                ...(callsites ? [winston.format(callsite)()] : []),
                winston.format.printf(info => info.message),
                ...(color ? [] : [winston.format.uncolorize()]),
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
