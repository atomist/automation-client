#!/usr/bin/env node

import { automationClient } from "./automationClient";
import { loadConfiguration } from "./configuration";
import { enableDefaultScanning } from "./scan";

try {
    loadConfiguration()
        .then(configuration => {
            enableDefaultScanning(configuration);
            return configuration;
        })
        .then(configuration => automationClient(configuration).run())
        .then(() => process.exit(0))
        .catch(e => {
            console.error(`Error: ${e.message}`);
            process.exit(1);
        });
} catch (e) {
    console.error(`Uncaught exception: ${e.message}`);
    process.exit(10);
}
