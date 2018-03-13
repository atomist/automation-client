import * as appRoot from "app-root-path";
import * as cluster from "cluster";
import * as config from "config";
import * as exp from "express";
import * as fs from "fs-extra";
import * as glob from "glob";
import * as stringify from "json-stringify-safe";
import * as _ from "lodash";
import * as path from "path";
import * as semver from "semver";

import {
    HandleCommand,
    HandleEvent,
} from "./index";
import { Ingester, IngesterBuilder } from "./ingesters";
import { logger } from "./internal/util/logger";
import { guid, obfuscateJson } from "./internal/util/string";
import { AutomationEventListener } from "./server/AutomationEventListener";
import { Maker } from "./util/constructionUtils";

/**
 * Customize the express server configuration: For example to add custom routes
 *
 * Example:
 *
 * const newRouteCustomizer = (express: exp.Express, ...handlers: exp.RequestHandler[]) => {
 *   express.get("/new-route", ...handlers, (req, res) => {
 *       res.json({ key: "value" });
 *   });
 * }
 */
export type ExpressCustomizer = (express: exp.Express, ...handlers: exp.RequestHandler[]) => void;

/**
 * Options for an automation node.
 */
export interface AutomationOptions {
    /**
     * Automation name.  If not given, the name is extracted from
     * the package.json.
     */
    name?: string;
    /**
     * Automation version.  Must be a valid semantic version,
     * https://semver.org/.  If not given, the version is extracted
     * from the package.json.
     */
    version?: string;
    /**
     * Atomist teams this automation will be registered with.  Must be
     * specified if groups is not specified.  Cannot be specified if
     * groups is specified.
     */
    teamIds?: string[];
    /**
     * Groups this automation will be registered with.  Must be
     * specified if teams is not specified.  Cannot be specified if
     * teams is specified.
     */
    groups?: string[];
    /**
     * If events should be queued when the registration is not
     * connected to the websocket, specificy "durable".  "ephemeral"
     * is suited for testing and running locally.
     */
    policy?: "ephemeral" | "durable";
    /**
     * GitHub personal access token with repo and read:org scopes for
     * all GitHub users and organizations associated with the Atomist
     * teams this automation is registered in.
     */
    token?: string;
    /** HTTP configuration, useful for health checks */
    http?: {
        enabled: boolean;
        port?: number;
        host?: string;
        customizers?: ExpressCustomizer[],
        auth?: {
            basic?: {
                enabled: boolean;
                username?: string;
                password?: string;
            }
            bearer?: {
                enabled: boolean;
                org?: string;
                adminOrg?: string;
            };
        };
    };
    /** websocket configuration */
    ws?: {
        enabled: boolean;
        termination?: {
            gracePeriod?: number;
            graceful?: boolean;
        };
        compress?: boolean;
    };
    /** Atomist API enpoints */
    endpoints?: {
        graphql?: string;
        api?: string;
    };
    /** Custom configuration you can abuse to your benefit */
    custom?: any;
}

/** DEPRECATED use AutomationOptions */
export type RunOptions = AutomationOptions;

/**
 * Options useful when running an automation client in server mode.
 */
export interface AutomationServerOptions extends AutomationOptions {
    /** environment automation is running in, e.g., "production" or "testing" */
    environment?: string;
    /** unique application name */
    application?: string;
    /** keywords useful for discovery */
    keywords?: string[];
    /** Whether and where to send application start and stop events. */
    applicationEvents?: {
        enabled: boolean;
        teamId?: string;
    };
    /**
     * Whether and how many workers to start up.  If enabled is true
     * and workers is false, a number of workers equal to the number
     * of available CPUs will be started.
     */
    cluster?: {
        enabled: boolean;
        workers?: number;
    };
    /** Logging configuration */
    logging?: {
        /** Log level */
        level: "debug" | "info" | "warn" | "error";
        custom?: any;
    };
    /** statsd config */
    statsd?: {
        host?: string;
        port?: number;
    };
}

/**
 * Atomist automation configuration.
 */
export interface Configuration extends AutomationServerOptions {
    /**
     * Automation commands this package provides.  If empty or null,
     * the package will be scanned for commands, which must be under a
     * directory named "commands".
     */
    commands?: Array<Maker<HandleCommand>>;
    /**
     * Automation event handlers this package provides.  If empty or
     * null, the package will be scanned for event handlers, which
     * must be under a directory named "events".
     */
    events?: Array<Maker<HandleEvent<any>>>;
    /** Custom event ingester */
    ingesters?: Array<Ingester | IngesterBuilder>;
    /** Log and metric sinks */
    listeners?: AutomationEventListener[];
}

/**
 * User per-automation configuration
 */
export interface ModuleOptions extends AutomationServerOptions {
    /** Automation name this configuration applies to. */
    name: string;
    /**
     * A valid version or version range, as defined by
     * https://www.npmjs.com/package/semver, this configurarion
     * applies to.  If not provided, it applies to all versions of the
     * named automation.
     */
    version?: string;
}

/**
 * User-wide configuration and user per-automation configuration
 */
export interface UserConfig extends AutomationServerOptions {
    modules?: ModuleOptions[];
}

/**
 * Generate defaults for various configuration option values.  These
 * will only be used if values are not provided by any source.  Values
 * not provided here will be `undefined`.
 *
 * @return default configuration
 */
export function defaultConfiguration(): Configuration {
    interface SimplePackage {
        name?: string;
        version?; string;
        keywords?: string[];
    }
    let pj: SimplePackage;
    try {
        // tslint:disable-next-line:no-var-requires
        pj = require(`${appRoot.path}/package.json`);
    } catch (e) {
        logger.warn(`failed to load package.json: ${e.message}`);
    }
    pj.name = pj.name || "atm-client-" + guid();
    pj.version = pj.version || "0.0.0";
    pj.keywords = pj.keywords || [];

    const cfg: Configuration = {
        name: pj.name,
        version: pj.version,
        keywords: pj.keywords,
        teamIds: [],
        groups: [],
        environment: "local",
        application: pj.name.replace(/^@.*?\//, ""),
        policy: "ephemeral",
        endpoints: {
            api: "https://automation.atomist.com/registration",
            graphql: "https://automation.atomist.com/graphql/team",
        },
        http: {
            enabled: true,
            host: "localhost",
            port: 2866,
            auth: {
                basic: {
                    enabled: true,
                },
                bearer: {
                    enabled: true,
                },
            },
            customizers: [],
        },
        ws: {
            enabled: true,
            termination: {
                graceful: false,
            },
            compress: false,
        },
        cluster: {
            enabled: false,
        },
        logging: {
            level: "info",
        },
        applicationEvents: {
            enabled: false,
        },
        commands: [],
        events: [],
        ingesters: [],
        listeners: [],
    };
    return cfg;
}

/**
 * Return Atomist user configuration directory.
 */
function userConfigDir(): string {
    const home = process.env[process.platform === "win32" ? "USERPROFILE" : "HOME"];
    return path.join(home, ".atomist");
}

/**
 * Return user automation client configuration path.
 */
function userConfigPath(): string {
    const clientConfigFile = "client.config.json";
    return path.join(userConfigDir(), clientConfigFile);
}

/**
 * Write user config securely, creating directories as necessary.
 */
export function writeUserConfig(cfg: UserConfig): Promise<void> {
    const cfgDir = userConfigDir();
    return fs.ensureDir(cfgDir)
        .then(() => fs.chmod(cfgDir, 0o700))
        .then(() => fs.writeJson(userConfigPath(), cfg, {
            spaces: 2,
            encoding: "utf8",
            mode: 0o600,
        }));
}

/**
 * Read and return user config from UserConfigFile.
 */
export function getUserConfig(): UserConfig {
    let cfg: UserConfig;
    try {
        cfg = fs.readJsonSync(userConfigPath());
    } catch (e) {
        logger.warn(`Failed to read user config: ${e.message}`);
        cfg = {};
    }
    // user config should not have name or version
    if (cfg.name) {
        delete cfg.name;
    }
    if (cfg.version) {
        delete cfg.version;
    }
    return cfg;
}

/**
 * Log the loading of a configuration
 *
 * @param source name of configuration source
 */
function cfgLog(source: string) {
    if (cluster.isMaster) {
        logger.debug(`Loading ${source} configuration`);
    }
}

/**
 * Overwrite values in the former configuration with values in the
 * latter.  The start object is modified.
 *
 * @param obj starting configuration
 * @param override configuration values to add/override those in start
 * @return resulting merged configuration
 */
function mergeConfigs(obj: Configuration, ...sources: Configuration[]): Configuration {
    return _.mergeWith(obj, ...sources, (objValue, srcValue) => {
        if (_.isArray(srcValue)) {
            return srcValue;
        }
    });
}

/**
 * Merge a user's global and proper per-module configuration, if it
 * exists.  Values from the per-module configuration take precedence
 * over the user-wide values.  Per-module configuration is gotten from
 * the first per-module configuration that matches name and,
 * optionally, the version is within the per-module configuration's
 * version range.  A module configuration without a version range
 * matches the named module with any version.  If no version is
 * provided, any version range is satisfied, meaning the first
 * per-module configuration with a matching name is used.  If no name
 * is provide, only the user configuration is loaded.  The first
 * per-module match is used.  This means if you have multiple
 * configurations for the same named module and you want to include a
 * default configuration for that module, put a configuration without
 * a version range _after_ all the configurations with version ranges.
 * Note that only values from the first per-module match are used.
 *
 * @param userConfig the user's configuration, which may include per-module configuration
 * @param name automation client package name to load as module config if it exists
 * @param version automation client package version to load as module config if
 *                version satifies module config version range
 * @return the merged module and user configuration
 */
export function resolveModuleConfig(userConfig: UserConfig, name?: string, version?: string): AutomationServerOptions {
    const cfg: AutomationServerOptions = {};
    if (userConfig) {
        cfgLog("user");
        const uc = _.cloneDeep(userConfig);
        let mc: Partial<ModuleOptions> = {};
        if (userConfig.modules) {
            delete uc.modules;
            if (name) {
                let modCfg: ModuleOptions;
                const moduleConfigs = userConfig.modules.filter(m => m.name === name);
                if (version) {
                    modCfg = moduleConfigs.find(m => !m.version || semver.satisfies(version, m.version));
                } else if (moduleConfigs.length > 0) {
                    modCfg = moduleConfigs[0];
                }
                if (modCfg) {
                    cfgLog("module");
                    if (modCfg.name) {
                        delete modCfg.name;
                    }
                    if (modCfg.version) {
                        delete modCfg.version;
                    }
                    mc = modCfg;
                }
            }
        }
        mergeConfigs(cfg, uc, mc);
    }
    return cfg;
}

/**
 * Try to read user config, overriding its values with a per-module
 * configuration that matches this automation.
 *
 * @param name automation client package name to load as module config if it exists
 * @param version automation client package version to load as module config if
 *                version satifies module config version range
 * @return module-specific config with user config supplying defaults
 */
export function loadUserConfiguration(name?: string, version?: string): AutomationServerOptions {
    const userConfig = getUserConfig();
    return resolveModuleConfig(userConfig, name, version);
}

/**
 * Load the automation configuration from the configuration object
 * exported from cfgPath and return it.  If no configuration path is
 * provided, the package will be searched for a file named
 * atomist.config.js.  If no atomist.config.js is found, an empty
 * object is returned.  If more than one is found, an exception is
 * thrown.
 *
 * @param cfgPath location of automation configuration
 * @return automation configuration
 */
export function loadAutomationConfig(cfgPath?: string): Configuration {
    let cfg: Configuration = {};
    if (!cfgPath) {
        const cfgFile = "atomist.config.js";
        const files = glob.sync(`${appRoot.path}/**/${cfgFile}`, { ignore: [".git/**", "node_modules/**"] });
        if (files.length === 1) {
            cfgPath = files[0];
        } else if (files.length > 1) {
            throw new Error(`More than one automation configuration found in package: ${files.join(", ")}`);
        }
    }
    if (cfgPath) {
        try {
            cfg = require(cfgPath).configuration;
            cfgLog("automation config");
        } catch (e) {
            logger.warn(`Failed to load configuration automation config file: ${e.message}`);
        }
    }
    return cfg;
}

/**
 * Load configuration from the file defined by the ATOMIST_CONFIG_PATH
 * environment variable, if it the variable is defined and the file
 * exists, and return it.  The contents of the ATOMIST_CONFIG_PATH
 * file should be serialized JSON of AutomationServerOptions.  If the
 * environment variable is not defined or the file path specified by
 * its value cannot be read as JSON, an empty object is returned.
 *
 * @return automation server options
 */
export function loadAtomistConfigPath(): AutomationServerOptions {
    let cfg: AutomationServerOptions = {};
    if (process.env.ATOMIST_CONFIG_PATH) {
        try {
            cfg = fs.readJsonSync(process.env.ATOMIST_CONFIG_PATH);
            cfgLog("ATOMIST_CONFIG_PATH");
        } catch (e) {
            logger.warn(`Failed to read ATOMIST_CONFIG_PATH: ${e.message}`);
        }
    }
    return cfg;
}

/**
 * Load configuration from the ATOMIST_CONFIG environment variable, if
 * it the variable is defined, and merge it into the passed in
 * configuration.  The value of the ATOMIST_CONFIG environment
 * variable should be serialized JSON of AutomationServerOptions.  The
 * values from the environment variable will override values in the
 * passed in configuration.  If the environment variable is not
 * defined, the passed in configuration is returned unchanged.
 *
 * @return automation server options
 */
export function loadAtomistConfig(): AutomationServerOptions {
    let cfg: AutomationServerOptions = {};
    if (process.env.ATOMIST_CONFIG) {
        try {
            cfg = JSON.parse(process.env.ATOMIST_CONFIG);
            cfgLog("ATOMIST_CONFIG");
        } catch (e) {
            logger.warn(`Failed to parse contents of ATOMIST_CONFIG environment variable: ${e.message}`);
        }
    }
    return cfg;
}

/**
 * Examine environment, config, and cfg for Atomist team IDs.  The
 * ATOMIST_TEAMS environment variable takes precedence over the
 * ATOMIST_TEAM environment variable, which takes precedence over the
 * configuration "teamdIds", which takes precedence over cfg.teamIds,
 * which may be undefined, null, or an empty array.
 */
export function resolveTeamIds(cfg: Configuration): string[] {
    if (process.env.ATOMIST_TEAMS) {
        cfg.teamIds = process.env.ATOMIST_TEAMS.split(",");
    } else if (process.env.ATOMIST_TEAM) {
        cfg.teamIds = [process.env.ATOMIST_TEAM];
    } else if (config.has("teamIds")) {
        cfg.teamIds = config.get("teamIds");
    }
    return cfg.teamIds;
}

/**
 * Resolve a value from a environment variables or configuration keys.
 * The environment variables are checked in order and take precedence
 * over the configuration key, which are also checked in order.  If
 * no truthy values are found, undefined is returned.
 *
 * @param environmentVariables environment variables to check
 * @param configKeyPaths configuration keys, as JSON paths, to check
 * @param defaultValue value to use if no environment variables or config keys have values
 * @return first truthy value found, or defaultValue
 */
export function resolveConfigurationValue(
    environmentVariables: string[],
    configKeyPaths: string[],
    defaultValue?: string,
): string {

    for (const ev of environmentVariables) {
        if (process.env[ev]) {
            return process.env[ev];
        }
    }
    for (const cv of configKeyPaths) {
        if (config.has(cv)) {
            return config.get(cv);
        }
    }
    return defaultValue;
}

/**
 * Resolve the token from the environment and configuration.  The
 * ATOMIST_TOKEN environment variable takes precedence over the
 * GITHUB_TOKEN environment variable, which takes precedence over the
 * config value, which takes precedence over the passed in value.
 */
export function resolveToken(cfg: Configuration): string {
    cfg.token = resolveConfigurationValue(["ATOMIST_TOKEN", "GITHUB_TOKEN"], ["token"], cfg.token);
    return cfg.token;
}

/**
 * Resolve the HTTP port from the environment and configuration.  The
 * PORT environment variable takes precedence over the config value.
 */
export function resolvePort(cfg: Configuration): number {
    if (process.env.PORT) {
        cfg.http.port = parseInt(process.env.PORT, 10);
    }
    return cfg.http.port;
}

/**
 * Make sure final configuration has the minimum configuration it
 * needs.  It will throw an error if required properties are missing.
 *
 * @param cfg final configuration
 */
function validateConfiguration(cfg: Configuration) {
    if (!cfg) {
        throw new Error(`no configuration defined`);
    }
    const missing: string[] = [];
    if (!cfg.name) {
        missing.push("name");
    }
    if (!cfg.version) {
        missing.push("version");
    }
    if (!cfg.token) {
        missing.push("token");
    }
    if ((!cfg.teamIds || cfg.teamIds.length < 1) && (!cfg.groups || cfg.groups.length < 1)) {
        missing.push("teamIds or groups");
    }
    if (missing.length > 0) {
        throw new Error(`configuration is missing required properties: ${missing.join(",")}`);
    }
}

/**
 * Load and populate the automation configuration.  The configuration
 * is loaded from several locations with the following precedence from
 * highest to lowest.
 *
 * 0.  Recognized environment variables (see below)
 * 1.  The value of the ATOMIST_CONFIG environment variable, parsed as
 *     JSON and cast to Configuration
 * 2.  The contents of the ATOMIST_CONFIG_PATH file as Configuration
 * 3.  The automation's atomist.config.js exported configuration as
 *     Configuration
 * 4.  The contents of the user's client.config.json as UserConfig
 *     resolving user and per-module configuration into Configuration
 * 5.  Values in DefaultConfiguration
 *
 * If any of the sources are missing, they are ignored.  Any truthy
 * configuration values specified by sources of higher precedence
 * cause any values provided by sources of lower precedence to be
 * ignored.  Typically the only required values in the configuration
 * for a successful registration are the token and non-empty teamIds
 * or groups and these can be provided via the ATOMIST_TOKEN and
 * ATOMIST_TEAMS environment variables.
 *
 * The configuration exported from the atomist.config.js is modified
 * to contain the final configuration values and returned from this
 * function.
 *
 * @param cfgPath path to file exporting the configuration object, if
 *                not provided the package is searched for one
 * @return merged configuration object
 */
export function loadConfiguration(cfgPath?: string): Configuration {
    const defCfg = defaultConfiguration();
    const userCfg = loadUserConfiguration(defCfg.name, defCfg.version);
    const autoCfg = loadAutomationConfig(cfgPath);
    const atmPathCfg = loadAtomistConfigPath();
    const atmCfg = loadAtomistConfig();
    const cfg = mergeConfigs({}, defCfg, userCfg, autoCfg, atmPathCfg, atmCfg);
    resolveTeamIds(cfg);
    resolveToken(cfg);
    resolvePort(cfg);
    validateConfiguration(cfg);
    return cfg;
}

/**
 * DEPRECATED: use loadConfiguration instead.
 */
export const findConfiguration = loadConfiguration;
