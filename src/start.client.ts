#!/usr/bin/env node

import * as openurl from "openurl";
import * as yargs from "yargs";

import { automationClient } from "./automationClient";
import { findConfiguration } from "./configuration";
import { enableDefaultScanning } from "./scan";

const configuration = enableDefaultScanning(findConfiguration());
const node = automationClient(configuration);

node.run()
    .then(() => {
        if (!!node.httpPort && yargs.argv.open === "true") {
            openurl.open(`http://localhost:${node.httpPort}/`);
        }
    });
