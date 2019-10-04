#!/usr/bin/env node
/*
 * Copyright © 2018 Atomist, Inc.
 *
 * See LICENSE file.
 */

// tslint:disable-next-line:no-import-side-effect
import "source-map-support/register";
import { printError } from "../lib/util/error";

async function main(): Promise<void> {
    try {
        const logging = require("../lib/util/logger");
        logging.configureLogging(logging.ClientLogging);

        let configuration = await require("../lib/configuration").loadConfiguration();
        configuration = require("../lib/scan").enableDefaultScanning(configuration);
        await require("../lib/automationClient").automationClient(configuration).run();
    } catch (e) {
        printError(e);
        process.exit(5);
    }
}

/* tslint:disable:no-console */

main()
    .catch(e => {
        console.error(`Unhandled exception: ${e.message}`);
        process.exit(10);
    });
