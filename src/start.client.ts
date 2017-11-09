#!/usr/bin/env node

import * as openurl from "openurl";
import * as yargs from "yargs";

import { automationClient } from "./automationClient";
import { findConfiguration } from "./configuration";
import { enableDefaultScanning } from "./scan";

const configuration = enableDefaultScanning(findConfiguration());
const node = automationClient(configuration);

if (configuration.commands) {
    configuration.commands.forEach(c => {
        node.withCommandHandler(c);
    });
}
if (configuration.events) {
    configuration.events.forEach(e => {
        node.withEventHandler(e);
    });
}

if (configuration.ingesters) {
    configuration.ingesters.forEach(e => {
        node.withIngester(e);
    });
}

node.run()
    .then(() => {
        if (!!node.httpPort && yargs.argv.open === "true") {
            openurl.open(`http://localhost:${node.httpPort}/`);
        }
    });
