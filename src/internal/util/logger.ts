import * as cluster from "cluster";
import * as fs from "fs-extra";
import * as stringify from "json-stringify-safe";
import * as _ from "lodash";
import * as os from "os";
import * as p from "path";
import * as serializeError from "serialize-error";
import * as stripAnsi from "strip-ansi";
import * as winston from "winston";
import * as context from "./cls";

export let LoggingConfig = {
    format: "logger",
};

export function setLogLevel(level: string) {
    winstonLogger.transports.console.level = level;
}

export function addFileTransport(filename: string, level: string) {
    const path = p.resolve(filename);
    if (!fs.existsSync(p.dirname(path))) {
        fs.mkdirsSync(p.dirname(path));
    }

    winstonLogger.add(
        winston.transports.File,
        {
            level,
            filename: p.basename(path),
            dirname: p.dirname(path),
            maxsize: 10 * 1024 * 1024,
            maxFiles: 10,
            tailable: true,
            zippedArchive: true,
            json: false,
            formatter,
        });
}

export function formatter(options: any): string {
    if (LoggingConfig.format === "cli") {
        return options.message;
    }

    const executionContext = context.get();
    let ctx: string;
    if (cluster.isMaster) {
        ctx = options.colorize ? winston.config.colorize(options.level, "m")
            : "m";
    } else {
        ctx = options.colorize ? winston.config.colorize(options.level, "w")
            : "w";
    }
    ctx += ":" + (options.colorize ? winston.config.colorize(options.level, process.pid.toString())
        : process.pid);
    if (executionContext) {
        if (executionContext.invocationId) {
            ctx += ":" + (options.colorize ? winston.config.colorize(options.level, executionContext.invocationId)
                : executionContext.invocationId);
        }
        if (executionContext.workspaceName) {
            ctx += ":" + (options.colorize ? winston.config.colorize(options.level, executionContext.workspaceName)
                : executionContext.workspaceName);
        } else if (executionContext.workspaceId) {
            ctx += ":" + (options.colorize ? winston.config.colorize(options.level, executionContext.workspaceId)
                : executionContext.workspaceId);
        }
        if (executionContext.operation) {
            ctx += ":" + (options.colorize ? winston.config.colorize(options.level, executionContext.operation)
                : executionContext.operation);
        }
        if (executionContext.ts) {
            const duration = _.padStart((new Date().getTime() - executionContext.ts).toString(), 3, "0");
            ctx += ":" + (options.colorize ? winston.config.colorize(options.level, duration)
                : duration);
        }
    }

    const level = options.colorize ? winston.config.colorize(options.level, _.padEnd(options.level, 5)) :
        _.padEnd(options.level, 5);

    const formatted = (options.timestamp ? new Date().toISOString() : "") + (ctx ? " [" + ctx + "]" : "")
        + " [" + level + "] " + (options.message ? options.message : "") +
        (options.meta && Object.keys(options.meta).length ?
            (options.message ? ": " : "") + stringify(options.meta) : "");

    if (options.colorize) {
        return formatted;
    } else {
        return stripAnsi(formatted);
    }
}

const winstonLogger = new winston.Logger({
    level: "debug",
    // handleExceptions: true,
    // humanReadableUnhandledException: true,
    exitOnError: false,
    transports: [
        new (winston.transports.Console)({
            level: "info",
            json: false,
            colorize: require("chalk").supportsColor,
            prettyPrint: true,
            timestamp: true,
            showLevel: true,
            align: true,
            stderrLevels: ["error"],
            formatter,
            // handleExceptions: true,
            // humanReadableUnhandledException: true,
        }),
    ],
});

function directConsoleToLogger() {
    // Redirect console logging methods to our logging setup
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

function initLogging() {
    // Normal startup of a client will redirect console logging
    // If startup happens with ATOMIST_DISABLE_LOGGING no console output will be redirected
    // and winston's console transport is set to silent to allow full control over logging
    // output
    if (process.env.ATOMIST_DISABLE_LOGGING !== "true") {
        directConsoleToLogger();
    } else {
        winstonLogger.transports.console.silent = true;

        // Add file logging into log directory
        const appDir = __dirname.split(p.join("node_modules", "@atomist", "automation-client"))[0];
        let pj: { name: string; };
        try {
            pj = require(p.join(appDir, "package.json"));
        } catch (e) {
            pj = { name: "atm-client" };
        }
        const filename = p.join(
            os.homedir(),
            ".atomist",
            "log",
            `${pj.name.replace(/^.*\//, "")}-local.log`);
        addFileTransport(filename, "debug");
    }
}

export const logger: Logger = winstonLogger;

// Ideally we wouldn't need this, but I'm still adding proper error handling
process.on("uncaughtException", err => {
    console.error(serializeError(err));
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

initLogging();
