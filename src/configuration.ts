/*
 * Copyright © 2017  Atomist
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import * as appRoot from "app-root-path";
import * as fs from "fs-extra";
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

    applicationEvents?: {
        enabled: boolean;
        teamId?: string;
    };
}

const UserConfigDir = `${process.env.HOME}/.atomist`;
export const UserConfigFile = `${UserConfigDir}/client.config.json`;
const UserConfigEncoding = "utf8";

export interface UserConfig {
    token?: string;
    teamIds?: string[];
    modules?: UserModuleConfig[];
}

export interface UserModuleConfig {
    name: string;
    token?: string;
    teamIds?: string[];
}

export interface ModuleConfig {
    token: string;
    teamIds: string[];
}

/*
 * Write user config securely, creating directories as necessary.
 */
export function writeUserConfig(cfg: UserConfig): Promise<void> {
    return fs.ensureDir(UserConfigDir)
        .then(() => fs.chmod(UserConfigDir, 0o700))
        .then(() => fs.writeJson(UserConfigFile, cfg, {
            spaces: 2,
            encoding: UserConfigEncoding,
            mode: 0o600,
        }));
}

/*
 * Try to read user config at $HOME/.atomist/client.config.json and
 * return the configured tokens and team IDs.  If there are values
 * specific for the client NPM module as read from the module's
 * package.json, it will return those, otherwise it falls through to
 * the default values under the `$default$` key.
 */
function getModuleConfig(): ModuleConfig {
    let userConfig: UserConfig;
    try {
        userConfig = fs.readJsonSync(UserConfigFile) as UserConfig;
    } catch (e) {
        const err = (e as Error).message;
        logger.info(`failed to read user config: ${err}`);
    }
    let pkgJson: any;
    try {
        pkgJson = fs.readJsonSync(`${appRoot.path}/package.json`);
    } catch (e) {
        const err = (e as Error).message;
        logger.info(`failed to read client module name: ${err}`);
    }

    return resolveModuleConfig(userConfig, pkgJson);
}

export function resolveModuleConfig(userConfig: UserConfig, pkgJson: any): ModuleConfig {
    let token: string;
    let teamIds: string[];
    if (userConfig) {
        let clientName: string;
        if (pkgJson && pkgJson.name) {
            clientName = pkgJson.name;
        }
        if (clientName && userConfig.modules) {
            const moduleConfig = userConfig.modules.find(m => m.name === clientName);
            if (moduleConfig) {
                token = moduleConfig.token;
                teamIds = moduleConfig.teamIds;
            }
        }
        if (!token && userConfig.token) {
            token = userConfig.token;
        }
        if ((!teamIds || teamIds.length < 1) && userConfig.teamIds) {
            teamIds = userConfig.teamIds;
        }
    }

    return { token, teamIds };
}

const AtomistConfigFile = "atomist.config.js";

export function findConfiguration(): Configuration {
    const moduleConfig = getModuleConfig();

    // TODO we could add an env variable ATOMIST_CONFIG for people to specify a path to a file to use
    const glob = require("glob");
    const files = glob.sync(`**/${AtomistConfigFile}`, { ignore: "node_modules/**" });

    if (files.length === 0) {
        throw new Error(`No '${AtomistConfigFile}' file found in project`);
    } else if (files.length > 1) {
        throw new Error(`More than one '${AtomistConfigFile}' file found in project: ${files.join(", ")}`);
    }

    const file = files[0];
    // This part is tricky but essentially brings in the user's handlers.
    const config = require(`${appRoot.path}/${file}`).configuration as Configuration;
    logger.debug("Using configuration from '%s': %s", file, JSON.stringify(config, cleanUp));
    config.token = (config.token) ? config.token : moduleConfig.token;
    config.teamIds = (config.teamIds && config.teamIds.length > 0) ?
        config.teamIds : moduleConfig.teamIds;

    validateConfiguration(config, file);
    return config;
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

function cleanUp(key: string, value: any) {
    if (key === "token" || key === "password") {
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
