import * as winston from "winston";

import { logger, LoggingConfig } from "../src/internal/util/logger";
import { GitHubRepoRef } from "../src/operations/common/GitHubRepoRef";

LoggingConfig.format = "cli";
(logger as winston.LoggerInstance).level = process.env.LOG_LEVEL || "info";

function barf(): string {
    throw new Error("<please set GITHUB_TOKEN env variable>");
}

export const GitHubToken: string = process.env.GITHUB_TOKEN || barf();

export const Creds = { token: GitHubToken };

export const RepoThatExists = new GitHubRepoRef("atomist-travisorg", "this-repository-exists");

function visibility(): "public" | "private" {
    const vis = process.env.GITHUB_VISIBILITY || "private";
    if (vis === "public" || vis === "private") {
        return vis;
    }
    throw new Error(`GITHUB_VISIBILITY must be public or private. yours is '${vis}'`);
}

export const TestRepositoryVisibility = visibility();
