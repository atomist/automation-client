import * as winston from "winston";

import { logger, LoggingConfig } from "../src/internal/util/logger";

LoggingConfig.format = "cli";
(logger as winston.LoggerInstance).level = process.env.LOG_LEVEL || "info";

function barf(): string {
    throw new Error("<please set GITHUB_TOKEN env variable>");
}

export const GitHubToken = process.env.GITHUB_TOKEN || barf();
