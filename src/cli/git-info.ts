#!/usr/bin/env node

import { LoggingConfig } from "../internal/util/logger";
process.env.SUPPRESS_NO_CONFIG_WARNING = "true";
LoggingConfig.format = "cli";

import * as appRoot from "app-root-path";
import { writeFile } from "fs";
import { obtainGitInfo } from "../internal/env/gitInfo";

obtainGitInfo(appRoot.path)
    .then(result => {
        return writeFile(`${appRoot.path}/git-info.json`,
            JSON.stringify(result, null, 2), err => {
                if (err) {
                    throw err;
                }
                console.log(`Successfully written git information to 'git-info.json'`);
            });

    });
