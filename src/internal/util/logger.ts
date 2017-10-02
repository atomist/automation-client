import * as  stringify from "json-stringify-safe";
import * as _ from "lodash";
import * as winston from "winston";
import * as context from "./cls";

export function formatter(options: any): string {
    const executionContext = context.get();

    let ctx;
    if (executionContext) {
        if (executionContext.correlationId) {
            ctx = options.colorize ? winston.config.colorize(options.level, executionContext.correlationId)
                : executionContext.correlationId;
        }
        if (executionContext.teamId) {
            ctx += ":" + (options.colorize ? winston.config.colorize(options.level, executionContext.teamId)
                : executionContext.teamId);
        }
        if (executionContext.operation) {
            ctx += ":" + (options.colorize ? winston.config.colorize(options.level, executionContext.operation)
                : executionContext.operation);
        }
    }

    const level = options.colorize ? winston.config.colorize(options.level, _.padEnd(options.level, 5)) :
        _.padEnd(options.level, 5);

    const formatted = (options.timestamp ? new Date().toISOString() : "") + (ctx ? " [" + ctx + "]" : "")
        + " [" + level + "] " + (options.message ? options.message : "") +
        (options.meta && Object.keys(options.meta).length ?
            (options.message ? ": " : "") + stringify(options.meta) : "");

    return formatted;
}

export const logger = new winston.Logger({
    level: "debug",
    // handleExceptions: true,
    // humanReadableUnhandledException: true,
    exitOnError: false,
    transports: [
        new (winston.transports.Console)({
            json: false,
            colorize: true,
            prettyPrint: true,
            timestamp: true,
            showLevel: true,
            align: true,
            stderrLevels: [ "error" ],
            formatter,
            // handleExceptions: true,
            // humanReadableUnhandledException: true,
        }),
    ],
});

// Redirect console logging methods to our logging setup
console.error = (message?: any, ...optionalParams: any[]) => {
    logger.error(message, ...optionalParams);
};
console.info = (message?: any, ...optionalParams: any[]) => {
    logger.info(message, ...optionalParams);
};
console.log = (message?: any, ...optionalParams: any[]) => {
    logger.info(message, ...optionalParams);
};
console.trace = (message?: any, ...optionalParams: any[]) => {
    logger.debug(message, ...optionalParams);
};
console.warn = (message?: any, ...optionalParams: any[]) => {
    logger.warn(message, ...optionalParams);
};

// Ideally we wouldn't need this, but I'm still adding proper error handling
process.on("uncaughtException", err => {
    console.error(err);
});
