import * as appRoot from "app-root-path";
import { HandleCommand } from "./HandleCommand";
import { HandleEvent } from "./HandleEvent";
import { logger } from "./internal/util/logger";
import { hideString } from "./internal/util/string";
import { AutomationEventListener } from "./server/AutomationEventListener";
import { RunOptions } from "./server/options";

export interface Configuration extends RunOptions {
    commands?: Array<() => HandleCommand>;
    events?: Array<() => HandleEvent<any>>;
    ingestors?: Array<() => HandleEvent<any>>;
    listeners?: AutomationEventListener[];
}

const AtomistConfigFile = "atomist.config.js";

export function findConfiguration(): Configuration {
    // TODO we could add an env variable ATOMIST_CONFIG for people to specify a path to a file to use

    const glob = require("glob");
    const files = glob.sync(`**/${AtomistConfigFile}`, { ignore: "node_modules/**"});

    if (files.length === 0) {
        throw new Error(`No '${AtomistConfigFile}' file found in project`);
    } else if (files.length > 1) {
        throw new Error(`More than one '${AtomistConfigFile}' file found in project: ${files.join(", ")}`);
    } else {
        const file = files[0];
        // This part is tricky but essentially brings in the user's handlers.
        const config = require(`${appRoot}/${file}`).configuration as Configuration;
        logger.debug("Using configuration from '%s': %s", file, JSON.stringify(config, cleanUp));

        validateConfiguration(config, file);
        return config;
    }
}

function validateConfiguration(configuration: Configuration, path: string) {
    if (!configuration) {
        throw new Error(`configuration type is missing in '${path}'`);
    }
    if (!configuration.name) {
        throw new Error(`name property is missing in '${path}'`);
    }
    if (!configuration.version) {
        throw new Error(`version property is missing in '${path}'`);
    }
    if (!configuration.token) {
        throw new Error(`token property is missing in '${path}'`);
    }
}

function cleanUp(key, value) {
    if (key === "token") {
        return hideString(value);
    } else if (key === "commands") {
        return undefined;
    } else if (key === "events") {
        return undefined;
    } else if (key === "ingestors") {
        return undefined;
    }
    return value;
}
