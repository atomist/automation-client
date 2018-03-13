#!/usr/bin/env node

import { automationClient } from "./automationClient";
import { loadConfiguration } from "./configuration";
import { logger } from "./index";
import { enableDefaultScanning } from "./scan";

const configuration = enableDefaultScanning(loadConfiguration());
const node = automationClient(configuration);

node.run()
    .then(() => process.exit(0), e => {
        logger.error(`automation client error: ${e.message}`);
        process.exit(1);
    });
