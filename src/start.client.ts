#!/usr/bin/env node

import * as openurl from "openurl";
import * as yargs from "yargs";

import { automationClient } from "./automationClient";
import { findConfiguration } from "./configuration";

const config = findConfiguration();
const node = automationClient(config);

if (config.commands) {
    config.commands.forEach(c => {
        node.withCommandHandler(c);
    });
}
if (config.events) {
    config.events.forEach(e => {
        node.withEventHandler(e);
    });
}

if (config.ingestors) {
    config.ingestors.forEach(e => {
        node.withIngestor(e);
    });
}

node.run();

// TODO really should wait here. Can run() return a promise?
// TODO should we make the open=true default for now? This will help with discovery
if (!!node.httpPort && yargs.argv.open === "true") {
    openurl.open(`http://localhost:${node.httpPort}/`);
}
