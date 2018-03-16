#!/usr/bin/env node

import { automationClient } from "./automationClient";
import { loadConfiguration } from "./configuration";
import { enableDefaultScanning } from "./scan";

loadConfiguration()
    .then(configuration => {
        enableDefaultScanning(configuration);
        return configuration;
    })
    .then(configuration => automationClient(configuration).run());
