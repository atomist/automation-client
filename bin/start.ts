#!/usr/bin/env node
/*
 * Copyright © 2018 Atomist, Inc.
 *
 * See LICENSE file.
 */

import "source-map-support/register";

function printError(e: any) {
    if (e instanceof Error) {
        if (e.stack && e.stack.includes(e.message)) {
            console.error(e.stack);
        } else if (e.stack) {
            console.error(e.message);
            console.error(e.stack);
        } else {
            console.error(e.message);
        }
    } else {
        console.error(e);
    }
}

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

main()
    .catch(e => {
        console.error(`Unhandled exception: ${e.message}`);
        process.exit(10);
    });
