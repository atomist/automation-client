import * as winston from "winston";

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
            // handleExceptions: true,
            // humanReadableUnhandledException: true,
        }),
    ],
});
