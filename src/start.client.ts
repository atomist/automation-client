#!/usr/bin/env node

import { automationClient } from "./automationClient";
import { findConfiguration } from "./configuration";
import { enableDefaultScanning } from "./scan";

const configuration = enableDefaultScanning(findConfiguration());
const node = automationClient(configuration);

node.run()
    .then(() => {
        // Intentionally left empty
    });
