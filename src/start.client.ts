#!/usr/bin/env node

import * as openurl from "openurl";
import * as yargs from "yargs";
import * as os from "os";

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

node.run()
    .then(() => {
        if (!!node.httpPort && yargs.argv.open === "true") {
            openurl.open(`http://${os.hostname()}:${node.httpPort}/`);
        }
    });


