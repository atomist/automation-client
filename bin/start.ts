#!/usr/bin/env node
/*
 * Copyright © 2018 Atomist, Inc.
 *
 * See LICENSE file.
 */

import "source-map-support/register";
import { automationClient } from "../lib/automationClient";
import { loadConfiguration } from "../lib/configuration";
import { enableDefaultScanning } from "../lib/scan";
import {
    ClientLogging,
    configureLogging,
} from "../lib/util/logger";

try {
    configureLogging(ClientLogging);
    loadConfiguration()
        .then(configuration => {
            enableDefaultScanning(configuration);
            return configuration;
        })
        .then(configuration => automationClient(configuration).run())
        .catch(e => {
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
            process.exit(1);
        });
} catch (e) {
    console.error(`Uncaught exception: ${e.message}`);
    process.exit(10);
}
