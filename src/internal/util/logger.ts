import * as _ from "lodash";
import * as winston from "winston";
import * as context from "./cls";

function formatter(options: any): string {
    const executionContext = context.get();

    const ctx = (executionContext && executionContext.correlationId ? executionContext.correlationId + ":" : "") +
        (executionContext && executionContext.teamId ? executionContext.teamId : "");

    const level = options.colorize ? winston.config.colorize(options.level, _.padEnd(options.level, 5)) :
        _.padEnd(options.level, 5);

    const formatted = (options.timestamp ? new Date().toISOString() : "") + (ctx ? " [" + ctx + "]" : "")
        + " [" + level + "] " + (options.message ? options.message : "") +
        (options.meta && Object.keys(options.meta).length ? "\n" + JSON.stringify(options.meta, null, 2) : "");

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

// Redirect console lgging methods to our logging setup
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
