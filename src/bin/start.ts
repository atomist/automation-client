#!/usr/bin/env node

import "source-map-support/register";
import { automationClient } from "../automationClient";
import { loadConfiguration } from "../configuration";
import { enableDefaultScanning } from "../scan";

try {
    loadConfiguration()
        .then(configuration => {
            enableDefaultScanning(configuration);
            return configuration;
        })
        .then(configuration => automationClient(configuration).run())
        .catch(e => {
            console.error(e);
            process.exit(1);
        });
} catch (e) {
    console.error(`Uncaught exception: ${e.message}`);
    process.exit(10);
}
