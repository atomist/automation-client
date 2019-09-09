#!/usr/bin/env node

/*
 * Copyright © 2018 Atomist, Inc.
 *
 * See LICENSE file.
 */

// tslint:disable-next-line:no-import-side-effect
import "source-map-support/register";

import * as appRoot from "app-root-path";
import * as _ from "lodash";
import * as path from "path";
import { printError } from "../lib/util/error";

async function main(): Promise<void> {
    try {
        const logging = require("../lib/util/logger");
        logging.configureLogging(logging.ClientLogging);

        let cfg = await require("../lib/configuration").loadConfiguration();
        cfg = require("../lib/scan").enableDefaultScanning(cfg);
        cfg.logging.banner.contributors.push(
            require("../lib/internal/transport/showStartupMessages").DevModeBannerContributor);

        const automationClient = require("../lib/automationClient").automationClient(cfg);
        await automationClient.run();
        const registration = prepareRegistration(cfg);

        const chokidar = require("chokidar");
        const watcher = chokidar.watch(["index.js", "lib/*.js", "lib/**/*.js"], { ignored: "\.ts" });

        const indexPath = path.join(appRoot.path, "index.js");
        const libPath = path.join(appRoot.path, "lib");
        const logger = logging.logger;

        watcher.on("ready", () => {
            watcher.on("all", async (e, path) => {
                const start = Date.now();
                logger.warn("Change to '%s' file detected. Attempting reload...", path);

                Object.keys(require.cache).forEach(id => {
                    if (id.startsWith(indexPath) || id.startsWith(libPath)) {
                        delete require.cache[id];
                    }
                });

                try {
                    let newCfg = await require("../lib/configuration").loadConfiguration();
                    newCfg = require("../lib/scan").enableDefaultScanning(newCfg);

                    diffRegistration(prepareRegistration(newCfg), registration);

                    // Clean out previous handlers and install new ones
                    automationClient.automationServer.commandHandlers = [];
                    newCfg.commands.forEach(c => automationClient.withCommandHandler(c));
                    automationClient.automationServer.eventHandlers = [];
                    newCfg.events.forEach(e => automationClient.withEventHandler(e));
                    // Now drop reference to previous configuration
                    automationClient.configuration = newCfg;

                    // Clean out the startup banner listeners
                    if (automationClient.defaultListeners.length > 2) {
                        automationClient.defaultListeners.splice(2);
                    }
                    await automationClient.raiseStartupEvent();

                    logger.warn(`Reload successful in ${((Date.now() - start) / 1000).toFixed(2)}s`);
                } catch (e) {
                    logger.error("Reload failed");
                    printError(e);
                }
            });
        });

    } catch (e) {
        printError(e);
        process.exit(5);
    }
}

function prepareRegistration(configuration: any): any {
    const automations = new (require("../lib/server/BuildableAutomationServer").BuildableAutomationServer)(configuration);
    (configuration.commands || []).forEach(c => automations.registerCommandHandler(c));
    (configuration.events || []).forEach(e => automations.registerEventHandler(e));
    (configuration.ingesters || []).forEach(i => automations.registerIngester(i));
    return require("../lib/internal/transport/websocket/payloads")
        .prepareRegistration(automations.automations, {}, configuration.metadata);
}

function diffRegistration(newReg: any, oldReg: any): void {
    if (!_.isEqual(newReg, oldReg)) {
        const jsonDiff = require("json-diff");
        const logging = require("../lib/util/logger");
        logging.logger.error(
            `Unable to reload. Incompatible changes to registration metadata detected:
${jsonDiff.diffString(newReg, oldReg).trim()}`);
        logging.logger.error("Exiting...");
        process.exit(15);
    }
}

main()
    .catch(e => {
        console.error(`Unhandled exception: ${e.message}`);
        process.exit(10);
    });
