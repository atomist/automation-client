/*
 * Copyright © 2018 Atomist, Inc.
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
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import * as appRoot from "app-root-path";
import * as cluster from "cluster";
import * as exp from "express";
import * as fs from "fs-extra";
import * as glob from "glob";
import * as stringify from "json-stringify-safe";
import * as _ from "lodash";
import * as p from "path";
import * as semver from "semver";
import { automationClientInstance } from "./globals";
import { HandleCommand } from "./HandleCommand";
import { HandleEvent } from "./HandleEvent";
import { ExpressServerOptions } from "./internal/transport/express/ExpressServer";
import { config } from "./internal/util/config";
import { logger } from "./internal/util/logger";
import {
    guid,
    obfuscateJson,
} from "./internal/util/string";
import { AutomationEventListener } from "./server/AutomationEventListener";
import { AutomationMetadataProcessor } from "./spi/env/MetadataProcessor";
import { SecretResolver } from "./spi/env/SecretResolver";
import { DefaultHttpClientFactory } from "./spi/http/axiosHttpClient";
import { HttpClientFactory } from "./spi/http/httpClient";
import { Maker } from "./util/constructionUtils";
import { loadHostPackageJson } from "./util/packageJson";

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
 * Post process the configuration after is has been merged from the various locations, but
 * before starting the automation client.
 */
export type ConfigurationPostProcessor<T = AnyOptions> = (configuration: Configuration) => Promise<Configuration & T>;

/**
 * A computed banner
 */
export interface Banner {

    /**
     * Banner content
     */
    banner: string;

    /**
     * Whether or not the banner content should be asciified
     */
    asciify: boolean;

    color: "black" | "red" | "green" | "yellow" | "blue" | "magenta" | "cyan" | "white" | "gray";
}

/**
 * A section that should be displayed in the banner.
 */
export interface BannerSection {

    title: string;

    body: string;
}

/**
 * Custom configuration you can abuse to your benefit
 */
export interface AnyOptions {

    /** Abuse goes here */
    [key: string]: any;
}

/**
 * Options for an automation node.
 */
export interface AutomationOptions extends AnyOptions {
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
     * Atomist workspaces this automation will be registered with.  Must be
     * specified if groups is not specified.  Cannot be specified if
     * groups is specified.
     */
    workspaceIds?: string[];
    /**
     * DO NOT USE.  Groups this automation will be registered with.
     * Must be specified if teams is not specified.  Cannot be
     * specified if teams is specified.  Providing groups indicates
     * this is a global automation, which can only successfully be
     * registered by Atomist.
     */
    groups?: string[];
    /**
     * If events should be queued when the registration is not
     * connected to the websocket, specificy "durable".  "ephemeral"
     * is suited for testing and running locally and is the default.
     */
    policy?: "ephemeral" | "durable";
    /**
     * Atomist API Key used to authenticate the user starting the client.
     */
    apiKey?: string;
    /** HTTP configuration, useful for health checks */
    http?: {
        enabled?: boolean
        client?: {
            factory?: HttpClientFactory,
        },
    } & Partial<ExpressServerOptions>;
    /** websocket configuration */
    ws?: {
        enabled?: boolean;
        termination?: {
            /**
             * if true, give in-flight transactions `gracePeriod`
             * milliseconds to complete when shutting down
             */
            graceful?: boolean;
            /** grace period in millisends */
            gracePeriod?: number;
        };
        /** compress messages over websocket */
        compress?: boolean;
        /** timeout in milliseconds */
        timeout?: number;
    };
    /** Atomist API endpoints */
    endpoints?: {
        graphql?: string;
        api?: string;
    };
    /**
     * Post-processors can be used to modify the configuration after
     * all standard configuration loading has been done and before the
     * client is started.  Post-processors return a configuration
     * promise so they can be asynchronous.
     */
    postProcessors?: ConfigurationPostProcessor[];
}

/**
 * Options useful when running an automation client in server mode.
 */
export interface AutomationServerOptions extends AutomationOptions {
    /** environment automation is running in, e.g., "production" or "testing" */
    environment?: string;
    /**
     * Application identifier used for metrics send to statsd.  If not
     * set, the automation client package name with any namespace
     * prefix removed is used.
     */
    application?: string;
    /** keywords useful for discovery */
    keywords?: string[];
    /** Whether and where to send application start and stop events to Atomist. */
    applicationEvents?: {
        enabled?: boolean;
        workspaceId?: string;
    };
    /**
     * Whether and how many workers to start up.  If enabled is true
     * and workers is false, a number of workers equal to the number
     * of available CPUs will be started.
     */
    cluster?: {
        enabled?: boolean;
        workers?: number;
    };
    /** Logging configuration */
    logging?: {
        /** Log level, default is "info" */
        level?: "debug" | "info" | "warn" | "error";
        /**
         * Custom log configuration, useful if your logging solution
         * requires host, port, token, etc. configuration.
         */
        custom?: any;
        /**
         * Print welcome banner; set to an arbitrary string to display,
         * default is name of automation-client
         */
        banner?: {
            enabled?: boolean;
            /** Message or Banner to be printed at the top of the banner */
            message?: string | ((configuration: Configuration) => Banner);
            /**
             * Add content to the banner which shows up between handlers and
             * footer
             */
            contributors?: Array<(configuration: Configuration) => string | BannerSection>;
        };
        /**
         * Log to file; set to file path to overwrite location and name of logfile,
         * defaults to ./log/automation-client.log in current working directory
         */
        file?: {
            enabled?: boolean,
            name?: string,
            level?: string,
        },
    };
    /** statsd config */
    statsd?: {
        /** Whether to send metrics statsd, default is false */
        enabled?: boolean;
        /**
         * statsd host.  If not set, use the host-shots default,
         * "localhost" at the time of this writing.
         */
        host?: string;
        /**
         * statsd port.  If not set, use the hot-shots default, 8125
         * at the time of this writing.
         */
        port?: number;
    };
    /** Register a custom secret resolver */
    secretResolver?: SecretResolver;
    /** Register a custom AutomationMetadataProcessor */
    metadataProcessor?: AutomationMetadataProcessor;
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
    events?: Array<Maker<HandleEvent>>;
    /** Custom event ingester */
    ingesters?: string[];
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
     * https://www.npmjs.com/package/semver, this configuration
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

    const pj: SimplePackage = loadHostPackageJson() || {} as SimplePackage;
    pj.name = pj.name || "atm-client-" + guid();
    pj.version = pj.version || "0.0.0";
    pj.keywords = pj.keywords || [];

    const cfg = loadDefaultConfiguration();
    cfg.name = pj.name;
    cfg.version = pj.version;
    cfg.keywords = pj.keywords;
    cfg.application = pj.name.replace(/^@.*?\//, "");

    return cfg;
}

/**
 * Exposes the configuration for lookup of configuration values.
 * This is useful for components to obtain values eg. from configuration.custom
 * like user provided secrets etc.
 * @param {string} path the property path evaluated against the configuration instance
 * @returns {T}
 */
export function configurationValue<T>(path: string, defaultValue?: T): T {
    if (automationClientInstance()) {
        const conf = automationClientInstance().configuration;
        let value;
        if (!path || path.length === 0) {
            value = conf;
        } else {
            value = _.get(conf, path);
        }
        if (value != null) {
            return value;
        } else if (defaultValue !== undefined) {
            return defaultValue;
        }

    } else if (defaultValue) {
        return defaultValue;
    }
    throw new Error(`Required @Value '${path}' not available`);
}

/**
 * Return the default configuration based on NODE_ENV or ATOMIST_ENV.
 * ATOMIST_ENV takes precedence if it is set.
 */
function loadDefaultConfiguration(): Configuration {
    const cfg = LocalDefaultConfiguration;

    let envSpecificCfg = {};
    const nodeEnv = process.env.ATOMIST_ENV || process.env.NODE_ENV;
    if (nodeEnv === "production") {
        envSpecificCfg = ProductionDefaultConfiguration;
    } else if (nodeEnv === "staging" || nodeEnv === "testing") {
        envSpecificCfg = TestingDefaultConfiguration;
    } else if (nodeEnv) {
        cfg.environment = nodeEnv;
    }

    return mergeConfigs(cfg, envSpecificCfg);
}

/**
 * Return Atomist user configuration directory.
 */
function userConfigDir(): string {
    const home = process.env[process.platform === "win32" ? "USERPROFILE" : "HOME"];
    return p.join(home, ".atomist");
}

/**
 * Return user automation client configuration path.
 */
export function userConfigPath(): string {
    const clientConfigFile = "client.config.json";
    return p.join(userConfigDir(), clientConfigFile);
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
    if (fs.existsSync(userConfigPath())) {
        try {
            const cfg = fs.readJsonSync(userConfigPath());
            // user config should not have name or version
            if (cfg.name) {
                delete cfg.name;
            }
            if (cfg.version) {
                delete cfg.version;
            }
            return cfg;
        } catch (e) {
            e.message = `Failed to read user config: ${e.message}`;
            throw e;
        }
    }
    return undefined;
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
export function mergeConfigs(obj: Configuration, ...sources: Configuration[]): Configuration {
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
        const files = glob.sync(`${appRoot.path}/**/${cfgFile}`, { ignore: ["**/{.git,node_modules}/**"] });
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
            e.message = `Failed to load ${cfgPath}.configuration: ${e.message}`;
            throw e;
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
            e.message = `Failed to read ATOMIST_CONFIG_PATH: ${e.message}`;
            throw e;
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
            e.message = `Failed to parse contents of ATOMIST_CONFIG environment variable: ${e.message}`;
            throw e;
        }
    }
    return cfg;
}

/**
 * Examine environment, config, and cfg for Atomist workspace IDs.
 * The ATOMIST_WORKSPACES environment variable takes precedence over
 * the configuration "workspaceIds", which takes precedence over
 * cfg.workspaceId, which may be undefined, null, or an empty array.
 * If the ATOMIST_WORKSPACES environment variable is not set,
 * workspaceIds is not set in config, and workspaceIds is falsey in
 * cfg and teamIds is resolvable from the configuration, workspaceIds
 * is set to teamIds.
 *
 * @param cfg current configuration, whose workspaceIds and teamIds
 *            properties may be modified by this function
 * @return the resolved workspace IDs
 */
export function resolveWorkspaceIds(cfg: Configuration): string[] {
    if (process.env.ATOMIST_WORKSPACES) {
        cfg.workspaceIds = process.env.ATOMIST_WORKSPACES.split(",");
    } else if (config("workspaceIds")) {
        cfg.workspaceIds = config("workspaceIds");
    }
    return cfg.workspaceIds;
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
        if (config(cv)) {
            return config(cv);
        }
    }
    return defaultValue;
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

const EnvironmentVariablePrefix = "ATOMIST_";

/**
 * Resolve ATOMIST_ environment variables and add them to config.
 * Variables of like ATOMIST_custom_foo_bar will be converted to
 * a json path of custom.foo.bar.
 * @param {Configuration} cfg
 */
export function resolveEnvironmentVariables(cfg: Configuration) {
    for (const key in process.env) {
        if (key.startsWith(EnvironmentVariablePrefix)
            && process.env.hasOwnProperty(key)) {
            const cleanKey = key.slice(EnvironmentVariablePrefix.length).split("_").join(".");
            if (cleanKey[0] !== cleanKey[0].toUpperCase()) {
                _.update(cfg, cleanKey, () => process.env[key]);
            }
        }
    }
}

/**
 * Resolve placeholders against the process.env.
 * Placeholders should be of form ${ENV_VAR}. Placeholders support default values
 * in case they aren't defined: ${ENV_VAR:default value}
 * @param {Configuration} config
 */
export function resolvePlaceholders(cfg: Configuration) {
    resolvePlaceholdersRecursively(cfg);
}

function resolvePlaceholdersRecursively(obj: any) {
    for (const property in obj) {
        if (obj.hasOwnProperty(property)) {
            if (typeof obj[property] === "object") {
                resolvePlaceholdersRecursively(obj[property]);
            } else if (typeof obj[property] === "string") {
                obj[property] = resolvePlaceholder(obj[property]);
            }
        }
    }
}

const PlaceholderExpression = /\$\{([.a-zA-Z_-]+)([.:0-9a-zA-Z-_ \" ]+)*\}/g;

function resolvePlaceholder(value: string): string {
    if (PlaceholderExpression.test(value)) {
        PlaceholderExpression.lastIndex = 0;
        let result;

        // tslint:disable-next-line:no-conditional-assignment
        while (result = PlaceholderExpression.exec(value)) {
            const fm = result[0];
            const envValue = process.env[result[1]];
            const defaultValue = result[2] ? result[2].trim().slice(1) : undefined;

            if (envValue) {
                value = value.split(fm).join(envValue);
            } else if (defaultValue) {
                value = value.split(fm).join(defaultValue);
            } else {
                throw new Error(`Environment variable '${result[1]}' is not defined`);
            }
        }
    }
    return value;
}

/**
 * Invoke postProcessors on the provided configuration.
 */
export function invokePostProcessors(cfg: Configuration): Promise<Configuration> {
    return cfg.postProcessors.reduce((pp, fp) => pp.then(fp), Promise.resolve(cfg));
}

/**
 * Make sure final configuration has the minimum configuration it
 * needs.  It will throw an error if required properties are missing.
 *
 * @param cfg final configuration
 */
export function validateConfiguration(cfg: Configuration) {
    if (!cfg) {
        throw new Error(`no configuration defined`);
    }
    const errors: string[] = [];
    if (!cfg.name) {
        errors.push("you must set a 'name' property in your configuration");
    }
    if (!cfg.version) {
        errors.push("you must set a 'version' property in your configuration");
    }
    if (!cfg.apiKey) {
        console.info("INFO: To obtain an 'apiKey' visit https://app.atomist.com/apikeys and run 'atomist config' " +
            "to configure the apiKey in your local configuration");
        errors.push("you must set an 'apiKey' property in your configuration");
    }
    cfg.workspaceIds = cfg.workspaceIds || [];
    cfg.groups = cfg.groups || [];
    if (cfg.workspaceIds.length < 1 && cfg.groups.length < 1) {
        errors.push("you must either provide an array of 'groups' in your configuration or, more likely, provide " +
            "an array of 'workspaceIds' in your configuration or set the ATOMIST_WORKSPACES environment variable " +
            "to a comma-separated list of workspace IDs");
    }
    if (cfg.workspaceIds.length > 0 && cfg.groups.length > 0) {
        errors.push("you cannot specify both 'workspaceIds' and 'groups' in your configuration, you must set one " +
            "to an empty array");
    }
    if (errors.length > 0) {
        const msg = `Configuration (${stringify(cfg, obfuscateJson)}) is not correct: ${errors.join("; ")}`;
        throw new Error(msg);
    }
}

/**
 * Load and populate the automation configuration.  The configuration
 * is loaded from several locations with the following precedence from
 * highest to lowest.
 *
 * 0.  Recognized environment variables (see below)
 * 1.  The value of the ATOMIST_CONFIG environment variable, parsed as
 *     JSON and cast to AutomationServerOptions
 * 2.  The contents of the ATOMIST_CONFIG_PATH file as AutomationServerOptions
 * 3.  The contents of the user's client.config.json as UserConfig
 *     resolving user and per-module configuration into Configuration
 * 4.  The automation's atomist.config.js exported configuration as
 *     Configuration
 * 5.  ProductionDefaultConfiguration if ATOMIST_ENV or NODE_ENV is set
 *     to "production" or TestingDefaultConfiguration if ATOMIST_ENV or
 *     NODE_ENV is set to "staging" or "testing", with ATOMIST_ENV
 *     taking precedence over NODE_ENV.
 * 6.  LocalDefaultConfiguration
 *
 * If any of the sources are missing, they are ignored.  Any truthy
 * configuration values specified by sources of higher precedence
 * cause any values provided by sources of lower precedence to be
 * ignored.  Arrays are replaced, not merged.  Typically the only
 * required values in the configuration for a successful registration
 * are the apiKey and non-empty workspaceIds.
 *
 * Placeholder of the form `${ENV_VARIABLE}` in string configuration
 * values will get resolved against the environment. The resolution
 * happens at the very end when all configs have been merged.
 *
 * The configuration exported from the atomist.config.js is modified
 * to contain the final configuration values and returned from this
 * function.
 *
 * @param cfgPath path to file exporting the configuration object, if
 *                not provided the package is searched for one
 * @return merged configuration object
 */
export function loadConfiguration(cfgPath?: string): Promise<Configuration> {
    // Register the logger globally so that downstream modules can see it
    (global as any).__logger = logger;

    let cfg: Configuration;
    try {
        const defCfg = defaultConfiguration();
        const autoCfg = loadAutomationConfig(cfgPath);
        const userCfg = loadUserConfiguration(defCfg.name, defCfg.version);
        const atmPathCfg = loadAtomistConfigPath();
        const atmCfg = loadAtomistConfig();
        cfg = mergeConfigs({}, defCfg, userCfg, autoCfg, atmPathCfg, atmCfg);
        resolveWorkspaceIds(cfg);
        resolvePort(cfg);
        resolveEnvironmentVariables(cfg);
        resolvePlaceholders(cfg);
    } catch (e) {
        logger.error(`Failed to load configuration: ${e.message}`);
        if (e.stack) {
            logger.error(`Stack trace:\n${e.stack}`);
        }
        return Promise.reject(e);
    }

    return invokePostProcessors(cfg)
        .then(completeCfg => {
            completeCfg.postProcessors = [];

            try {
                validateConfiguration(completeCfg);
            } catch (e) {
                return Promise.reject(e);
            }
            return Promise.resolve(completeCfg);
        });
}

/**
 * Default configuration when running in neither testing or
 * production.
 */
export const LocalDefaultConfiguration: Configuration = {
    workspaceIds: [],
    groups: [],
    environment: "local",
    policy: "ephemeral",
    endpoints: {
        api: "https://automation.atomist.com/registration",
        graphql: "https://automation.atomist.com/graphql/team",
    },
    http: {
        enabled: true,
        host: "localhost",
        auth: {
            basic: {
                enabled: false,
            },
            bearer: {
                enabled: false,
            },
        },
        customizers: [],
        client: {
            factory: DefaultHttpClientFactory,
        },
    },
    ws: {
        enabled: true,
        termination: {
            graceful: false,
            gracePeriod: 10000,
        },
        compress: false,
        timeout: 10000,
    },
    applicationEvents: {
        enabled: false,
    },
    cluster: {
        enabled: false,
    },
    logging: {
        level: "debug",
        file: {
            enabled: true,
            level: "debug",
        },
        banner: {
            enabled: true,
            contributors: [],
        },
    },
    statsd: {
        enabled: false,
    },
    commands: null,
    events: null,
    ingesters: [],
    listeners: [],
    postProcessors: [],
};

/**
 * Configuration defaults for production environments.
 */
export const ProductionDefaultConfiguration: Partial<Configuration> = {
    environment: "production",
    policy: "durable",
    http: {
        port: 2866,
        auth: {
            basic: {
                enabled: true,
            },
            bearer: {
                enabled: true,
            },
        },
    },
    ws: {
        termination: {
            graceful: true,
        },
        compress: true,
    },
    applicationEvents: {
        enabled: true,
    },
    cluster: {
        enabled: true,
    },
    logging: {
        level: "info",
        file: {
            enabled: false,
        },
    },
    statsd: {
        enabled: true,
    },
};

/**
 * Configuration defaults for pre-production environments.
 */
export const TestingDefaultConfiguration: Partial<Configuration> = {
    environment: "testing",
    policy: "durable",
    http: {
        auth: {
            basic: {
                enabled: true,
            },
            bearer: {
                enabled: true,
            },
        },
    },
    ws: {
        termination: {
            graceful: true,
        },
        compress: true,
    },
    applicationEvents: {
        enabled: true,
    },
    cluster: {
        enabled: true,
    },
    logging: {
        level: "info",
        file: {
            enabled: false,
        },
    },
    statsd: {
        enabled: true,
    },
};
