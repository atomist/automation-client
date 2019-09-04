#!/usr/bin/env node
/*
 * Copyright © 2018 Atomist, Inc.
 *
 * See LICENSE file.
 */
// tslint:disable-next-line:no-import-side-effect
import "source-map-support/register";

import * as appRoot from "app-root-path";
import * as path from "path";
import { metadataFromInstance } from "../lib/internal/metadata/metadataReading";
import { toFactory } from "../lib/util/constructionUtils";
import { printError } from "../lib/util/error";

/* tslint:disable:no-console */

async function main(): Promise<void> {
    try {
        const logging = require("../lib/util/logger");
        logging.configureLogging(logging.ClientLogging);

        let cfg = await require("../lib/configuration").loadConfiguration();
        cfg = require("../lib/scan").enableDefaultScanning(cfg);
        const cfgCommands = cfg.commands.map(c => metadataFromInstance(toFactory(c)())).sort((c1, c2) => c1.name.localeCompare(c2.name));
        const cfgEvents = cfg.events.map(c => metadataFromInstance(toFactory(c)())).sort((c1, c2) => c1.name.localeCompare(c2.name));

        const automationClient = require("../lib/automationClient").automationClient(cfg);
        await automationClient.run();

        const chokidar = require("chokidar");
        const watcher = chokidar.watch(["index.js", "lib/*.js", "lib/**/*.js"], { ignored: "\.ts" });

        const indexPath = path.join(appRoot.path, "index.js");
        const libPath = path.join(appRoot.path, "lib");

        watcher.on("ready", () => {
            watcher.on("all", async (e, path) => {

                require("../lib/util/logger").logger.warn("Change to '%s' file detected. Attempting reload...", path);

                Object.keys(require.cache).forEach(id => {
                    if (id.startsWith(indexPath) || id.startsWith(libPath)) {
                        delete require.cache[id];
                    }
                });

                let newCfg = await require("../lib/configuration").loadConfiguration();
                newCfg = require("../lib/scan").enableDefaultScanning(newCfg);

                const newCfgCommands = newCfg.commands.map(c => metadataFromInstance(toFactory(c)())).sort((c1, c2) => c1.name.localeCompare(c2.name));
                const newCfgEvents = newCfg.events.map(c => metadataFromInstance(toFactory(c)())).sort((c1, c2) => c1.name.localeCompare(c2.name));

                if (JSON.stringify(newCfgCommands) !== JSON.stringify(cfgCommands) || JSON.stringify(newCfgEvents) !== JSON.stringify(cfgEvents)) {
                    require("../lib/util/logger").logger.error("Unable to reload. Incompatible changes to registration metadata detected. Exiting...");
                    process.exit(15);
                }

                automationClient.automationServer.commandHandlers = [];
                automationClient.automationServer.eventHandlers = [];
                newCfg.commands.forEach(c => {
                    automationClient.withCommandHandler(c);
                });
                newCfg.events.forEach(e => {
                    automationClient.withEventHandler(e);
                });

                require("../lib/util/logger").logger.warn("Reload successful");

                await automationClient.raiseStartupEvent();
            });
        });

    } catch (e) {
        printError(e);
        process.exit(5);
    }
}

main()
    .catch(e => {
        console.error(`Unhandled exception: ${e.message}`);
        process.exit(10);
    });
