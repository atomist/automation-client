#! /usr/bin/env node
/*
 * Copyright © 2018 Atomist, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as fs from "fs-extra";
import * as path from "path";

import {
    obtainGitInfo,
} from "../internal/env/gitInfo";
import {
    logger,
    LoggingConfig,
} from "../internal/util/logger";

LoggingConfig.format = "cli";

/**
 * Generate git-info.json for automation client.
 */
async function main(): Promise<never> {
    try {
        const cwd = process.cwd();
        const gitInfoName = "git-info.json";
        const gitInfoPath = path.join(cwd, gitInfoName);
        const gitInfo = await obtainGitInfo(cwd);
        await fs.writeJson(gitInfoPath, gitInfo, { spaces: 2, encoding: "utf8" });
        logger.info(`Successfully wrote git information to '${gitInfoPath}'`);
        process.exit(0);
    } catch (e) {
        logger.error(`Failed to generate Git information: ${e.message}`);
        process.exit(1);
    }
    throw new Error("Should never get here, process.exit() called above");
}

main()
    .catch((err: Error) => {
        logger.error(`Unhandled exception: ${err.message}`);
        process.exit(101);
    });
