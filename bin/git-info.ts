#! /usr/bin/env node
/*
 * Copyright © 2018 Atomist, Inc.
 *
 * See LICENSE file.
 */

import * as fs from "fs-extra";
import * as path from "path";
import { obtainGitInfo } from "../lib/internal/env/gitInfo";

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
        console.info(`Successfully wrote git information to '${gitInfoPath}'`);
        process.exit(0);
    } catch (e) {
        console.error(`Failed to generate Git information: ${e.message}`);
        process.exit(1);
    }
    throw new Error("Should never get here, process.exit() called above");
}

main()
    .catch((err: Error) => {
        console.error(`Unhandled exception: ${err.message}`);
        process.exit(101);
    });
