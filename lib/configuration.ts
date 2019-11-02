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

/* tslint:disable:max-file-line-count */

import * as appRoot from "app-root-path";
import * as cluster from "cluster";
import * as exp from "express";
import * as fg from "fast-glob";
import * as fs from "fs-extra";
import * as stringify from "json-stringify-safe";
import * as _ from "lodash";
import * as os from "os";
import * as p from "path";
import * as semver from "semver";
import { automationClientInstance } from "./globals";
import { HandleCommand } from "./HandleCommand";
import { HandleEvent } from "./HandleEvent";
import { ExpressServerOptions } from "./internal/transport/express/ExpressServer";
import { QueuingWebSocketLifecycle } from "./internal/transport/websocket/WebSocketLifecycle";
import { config } from "./internal/util/config";
import { defaultGracePeriod } from "./internal/util/shutdown";
import {
    guid,
    obfuscateJson,
} from "./internal/util/string";
import { AutomationEventListener } from "./server/AutomationEventListener";
import { AutomationMetadataProcessor } from "./spi/env/MetadataProcessor";
import { SecretResolver } from "./spi/env/SecretResolver";
import {
    DefaultGraphClientFactory,
    GraphClientFactory,
} from "./spi/graph/GraphClientFactory";
import {
    DefaultHttpClientFactory,
    HttpClientFactory,
} from "./spi/http/httpClient";
import {
    DefaultWebSocketFactory,
    WebSocketFactory,
} from "./spi/http/wsClient";
import {
    DefaultStatsDClientFactory,
    StatsDClientFactory,
} from "./spi/statsd/statsdClient";
import { Maker } from "./util/constructionUtils";
import { logger } from "./util/logger";
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
        client?: {
            factory?: WebSocketFactory,
        },
        termination?: {
            /**
             * If true, wait for up to `gracePeriod` milliseconds to
             * process in-flight and queued requests.
             */
            graceful?: boolean;
            /**
             * Grace period in milliseconds.  Note the actual time to
             * shutdown gracefully may be more than twice this, as
             * this period is used to first wait for requests and then
             * used again to wait for any cluster workers to shutdown.
             * If some part of the shutdown hangs, it could take up to
             * ten times this period for all processes to exit.
             */
            gracePeriod?: number;
        };
        /** compress messages over websocket */
        compress?: boolean;
        /** timeout in milliseconds */
        timeout?: number;
        /** Configure backoff behavior on the WS connection */
        backoff?: {
            /**
             * Max number of the pending messages in the queue before
             * initiating backoff
             */
            threshold?: number;
            /** Interval in ms to check threshold */
            interval?: number;
            /**
             * Duration in ms the backend should backoff before sending
             * any more messages
             */
            duration?: number;
            /**
             * Factor (0 < x <= 1) multiply threshold to get to the lower backoff
             * boundary
             */
            factor?: number;
        },
    };
    graphql?: {
        client?: {
            factory: GraphClientFactory,
        },
    };
    /** Atomist API endpoints */
    endpoints?: {
        graphql?: string;
        api?: string;
        auth?: string;
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
        maxConcurrentPerWorker?: number;
    };
    /** Logging configuration */
    logging?: {
        /** Log level, default is "info" */
        level?: "silly" | "debug" | "verbose" | "info" | "warn" | "error";
        /** Log the file name and line number of the JS file calling the log method */
        callsite?: boolean,
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
            enabled?: boolean;
            name?: string;
            level?: "silly" | "debug" | "verbose" | "info" | "warn" | "error";
        };
    };
    /** Redaction configuration */
    redact?: {
        /** Redact log messages */
        log?: boolean;
        /** Redact messages send via the message client */
        messages?: boolean;
        /** Register patterns to look for and optional replacements */
        patterns?: Array<{ regexp: RegExp | string, replacement?: string }>;
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

        /**
         * statsd client factory to create instances of StatsDClient
         */
        client?: {
            factory: StatsDClientFactory,
        }

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
        version?: string;
        keywords?: string[];
    }

    const pj: SimplePackage = loadHostPackageJson() || {};
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
export function configurationValue<T>(path: string = "", defaultValue?: T): T {
    if (automationClientInstance()) {
        const conf = automationClientInstance().configuration;
        let value;
        if (!path || path.length === 0) {
            value = conf;
        } else {
            value = _.get(conf, path);
        }
        // tslint:disable-next-line:no-null-keyword
        if (value !== null && value !== undefined) {
            return value;
        }
    }

    if (defaultValue !== undefined) {
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
        cfgLog("production default");
    } else if (nodeEnv === "staging" || nodeEnv === "testing") {
        envSpecificCfg = TestingDefaultConfiguration;
        cfgLog("testing default");
    } else if (nodeEnv) {
        cfg.environment = nodeEnv;
    }

    // For internal testing use to switch to staging apis
    if (process.env.ATOMIST_ENDPOINTS === "staging") {
        cfg.endpoints = {
            graphql: "https://automation-staging.atomist.services/graphql/team",
            api: "https://automation-staging.atomist.services/registration",
            auth: "https://api-staging.atomist.services/v2/auth",
        };
    }

    return mergeConfigs(cfg, envSpecificCfg);
}

/**
 * Return Atomist user configuration directory.
 */
function userConfigDir(): string {
    return p.join(os.homedir(), ".atomist");
}

/**
 * Return user automation client configuration path.
 */
export function userConfigPath(): string {
    const clientConfigFile = "client.config.json";
    return p.join(userConfigDir(), clientConfigFile);
}

/**
 * Return user automation client configuration paths including
 * such referenced by configuration profiles.
 */
export function userConfigPaths(): string[] {
    const configPaths = [userConfigPath()];
    const profiles = process.env.ATOMIST_CONFIG_PROFILE || process.env.ATOMIST_CONFIG_PROFILES;
    if (!!profiles) {
        for (const profile of profiles.split(",")) {
            configPaths.push(p.join(userConfigDir(), `client.config-${profile}.json`));
        }
    }
    return configPaths;
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
    const configPaths = userConfigPaths();
    const userConfigs = [];
    for (const configPath of configPaths) {
        if (fs.existsSync(configPath)) {
            try {
                const cfg = fs.readJsonSync(configPath);
                // user config should not have name or version
                if (cfg.name) {
                    delete cfg.name;
                }
                if (cfg.version) {
                    delete cfg.version;
                }
                userConfigs.push(cfg);
            } catch (e) {
                e.message = `Failed to read user config: ${e.message}`;
                throw e;
            }
        }
    }

    if (userConfigs.length > 0) {
        return mergeConfigs({}, ...userConfigs);
    } else {
        return undefined;
    }
}

/**
 * Log the loading of a configuration
 *
 * @param source name of configuration source
 */
function cfgLog(source: string): void {
    if (cluster.isMaster) {
        logger.debug(`Loading configuration '${source}'`);
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
 * Overwrite values in the former configuration with values in the
 * latter.  The start object is modified.  Arrays are concatenated.
 *
 * @param obj starting configuration
 * @param override configuration values to add/override those in start
 * @return resulting merged configuration
 */
export function deepMergeConfigs(obj: Configuration, ...sources: Configuration[]): Configuration {
    return _.mergeWith(obj, ...sources, (objValue, srcValue) => {
        if (_.isArray(objValue) && srcValue) {
            return objValue.concat(srcValue);
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
        cfgLog(userConfigPath());
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
 * @return automation configuration or undefined
 */
export async function loadAutomationConfig(configPath?: string): Promise<Configuration | undefined> {
    let cfgPath = configPath;
    if (!cfgPath) {
        const cfgFile = "atomist.config.js";
        const files = await fg(`${appRoot.path}/**/${cfgFile}`,
            { ignore: [`${appRoot.path}/**/{.git,node_modules}/**`] });
        if (files.length === 1) {
            cfgPath = files[0];
        } else if (files.length > 1) {
            throw new Error(`More than one automation configuration found in package: ${files.join(", ")}`);
        }
    }
    if (cfgPath) {
        try {
            let cfg = require(cfgPath).configuration;
            if (cfg instanceof Promise) {
                cfg = await cfg;
            }
            cfgLog(cfgPath);
            return cfg;
        } catch (e) {
            e.message = `Failed to load ${cfgPath}.configuration: ${e.message}`;
            throw e;
        }
    }
    return undefined;
}

/**
 * Load the automation configuration from the configuration objects
 * exported and merged by all index.js files in the automation client.
 *
 * @return automation configuration
 */
export async function loadIndexConfig(): Promise<Configuration> {
    const cfgFile = "index.js";
    const files = await fg(`${appRoot.path}/**/${cfgFile}`,
        { ignore: [`${appRoot.path}/**/{.git,node_modules}/**`] });

    if (files.length > 0) {
        const cfgs = [];
        for (const f of files) {
            try {
                let cfg = require(f).configuration || {};
                if (cfg instanceof Promise) {
                    cfg = await cfg;
                }
                cfgLog(f);
                cfgs.push(cfg);
            } catch (e) {
                e.message = `Failed to load ${f}.configuration: ${e.message}`;
                throw e;
            }
        }
        return deepMergeConfigs({}, ...cfgs);
    }
    return {};
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
 * the config "workspaceIds", which takes precedence over
 * cfg.workspaceId, which may be undefined, null, or an empty array.
 *
 * @param cfg current configuration, whose workspaceIds
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
export function resolveEnvironmentVariables(cfg: Configuration): void {
    for (const key in process.env) {
        if (key.startsWith(EnvironmentVariablePrefix) && process.env.hasOwnProperty(key)) {
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
 */
export async function resolvePlaceholders(cfg: Configuration,
                                          replacer: (value: string) => Promise<string> = resolvePlaceholder,
                                          visited: any[] = [cfg.sdm, cfg.local, cfg.events, cfg.commands, cfg.listeners]): Promise<void> {
    await resolvePlaceholdersRecursively(cfg, visited, replacer);
}

async function resolvePlaceholdersRecursively(obj: any, visited: any[], replacer: (value: string) => Promise<string>): Promise<void> {
    if (!visited.includes(obj)) {
        visited.push(obj);
        for (const property in obj) {
            if (_.has(obj, property)) {
                if (typeof obj[property] === "object") {
                    await resolvePlaceholdersRecursively(obj[property], visited, replacer);
                } else if (typeof obj[property] === "string") {
                    obj[property] = await replacer(obj[property]);
                }
            }
        }
    }
}

const PlaceholderExpression = /\$\{([.a-zA-Z_-]+)([.:0-9a-zA-Z-_ \" ]+)*\}/g;

async function resolvePlaceholder(value: string): Promise<string> {
    if (!PlaceholderExpression.test(value)) {
        return value;
    }
    PlaceholderExpression.lastIndex = 0;
    let currentValue = value;
    let result: RegExpExecArray;
    // tslint:disable-next-line:no-conditional-assignment
    while (result = PlaceholderExpression.exec(currentValue)) {
        const fm = result[0];
        const envValue = process.env[result[1]];
        const defaultValue = result[2] ? result[2].trim().slice(1) : undefined;

        if (envValue) {
            currentValue = currentValue.split(fm).join(envValue);
        } else if (defaultValue) {
            currentValue = currentValue.split(fm).join(defaultValue);
        } else {
            throw new Error(`Environment variable '${result[1]}' is not defined`);
        }
    }
    return currentValue;
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
export function validateConfiguration(cfg: Configuration): void {
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
        logger.info("To obtain an 'apiKey' visit https://app.atomist.com/apikeys and run 'atomist config' " +
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
 * 1.  `ATOMIST_` environment variables, see [[resolveEnvironmentVariables]]
 * 2.  Configuration returned from the post-processors.
 * 3.  Recognized environment variables, see [[resolveWorkspaceIds]],
 *     [[resolvePort]]
 * 4.  The value of the ATOMIST_CONFIG environment variable, parsed as
 *     JSON and cast to AutomationServerOptions
 * 5.  The contents of the ATOMIST_CONFIG_PATH file as AutomationServerOptions
 * 6.  The contents of the user's client.config.json as UserConfig
 *     resolving user and per-module configuration into Configuration
 * 7.  The automation atomist.config.js or _all_ index.js files'
 *     configurations exported as `configuration` from those files
 * 8.  ProductionDefaultConfiguration if ATOMIST_ENV or NODE_ENV is set
 *     to "production" or TestingDefaultConfiguration if ATOMIST_ENV or
 *     NODE_ENV is set to "staging" or "testing", with ATOMIST_ENV
 *     taking precedence over NODE_ENV.
 * 9.  LocalDefaultConfiguration
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
 * happens after all of the above configuration sources have been
 * merged.
 *
 * After all sources are merged and the resulting configuration
 * processed for placeholders and environment variables, the
 * configuration is validated using [[validateConfiguration]].
 *
 * The configuration exported from the index.js (or atomist.config.js)
 * is modified to contain the final configuration values and returned
 * from this function.
 *
 * @param cfgPath path to file exporting the configuration object, if
 *                not provided the package is searched for one
 * @return merged configuration object
 */
export async function loadConfiguration(cfgPath?: string): Promise<Configuration> {
    // Register the logger globally so that downstream modules can see it
    (global as any).__logger = logger;

    let cfg: Configuration;
    try {
        const defCfg = defaultConfiguration();
        const autoCfg = (await loadAutomationConfig(cfgPath)) || (await loadIndexConfig());
        const userCfg = loadUserConfiguration(defCfg.name, defCfg.version);
        const atmPathCfg = loadAtomistConfigPath();
        const atmCfg = loadAtomistConfig();
        cfg = mergeConfigs({}, defCfg, autoCfg, userCfg, atmPathCfg, atmCfg);
        resolveWorkspaceIds(cfg);
        resolvePort(cfg);
    } catch (e) {
        e.message = `Failed to load configuration: ${e.message}`;
        logger.error(e.message);
        if (e.stack) {
            logger.error(`Stack trace:\n${e.stack}`);
        }
        throw e;
    }

    const completeCfg = await invokePostProcessors(cfg);
    completeCfg.postProcessors = [];

    resolveEnvironmentVariables(completeCfg);
    await resolvePlaceholders(completeCfg);
    validateConfiguration(completeCfg);
    return completeCfg;
}

/**
 * Default set of regular expressions used to remove sensitive
 * information from messages and logs.  The entries are applied in
 * order, so more specific regular expressions should be placed
 * earlier in the list to avoid a shorter replacement preventing a
 * longer replacement from being applied.
 */
export const DEFAULT_REDACTION_PATTERNS = [
    {
        regexp: /\b[A-F0-9]{64}\b/g,
        replacement: "[ATOMIST_API_KEY]",
    },
    {
        regexp: /[1-9][0-9]+-[0-9a-zA-Z]{40}/g,
        replacement: "[TWITTER_ACCESS_TOKEN]",
    },
    {
        regexp: /EAACEdEose0cBA[0-9A-Za-z]+/g,
        replacement: "[FACEBOOK_ACCESS_TOKEN]",
    },
    {
        regexp: /AIza[0-9A-Za-z\-_]{35}/g,
        replacement: "[GOOGLE_API_KEY]",
    },
    {
        regexp: /[0-9]+-[0-9A-Za-z_]{32}\.apps\.googleusercontent\.com/g,
        replacement: "[GOOGLE_OAUTH_ID]",
    },
    {
        regexp: /sk_live_[0-9a-z]{32}/g,
        replacement: "[PICATIC_API_KEY|",
    },
    {
        regexp: /sk_live_[0-9a-zA-Z]{24}/g,
        replacement: "[STRIPE_REGULAR_API_KEY]",
    },
    {
        regexp: /rk_live_[0-9a-zA-Z]{24}/g,
        replacement: "[STRIPE_RESTRICTED_API_KEY]",
    },
    {
        regexp: /sq0atp-[0-9A-Za-z\-_]{22}/g,
        replacement: "[SQUARE_OAUTH_TOKEN]",
    },
    {
        regexp: /sq0csp-[0-9A-Za-z\-_]{43}/g,
        replacement: "[SQUARE_OAUTH_SECRET]",
    },
    {
        regexp: /access_token\$production\$[0-9a-z]{16}\$[0-9a-f]{32}/g,
        replacement: "[BRAINTREE_ACCESS_TOKEN]",
    },
    {
        regexp: /amzn\.mws\.[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g,
        replacement: "[AMAZON_AUTH_TOKEN]",
    },
    {
        regexp: /SK[0-9a-fA-F]{32}/g,
        replacement: "[TWILLIO_API_KEY]",
    },
    {
        regexp: /key-[0-9a-zA-Z]{32}/g,
        replacement: "[MAILGUN_KEY]",
    },
    {
        regexp: /[0-9a-f]{32}-us[0-9]{1,2}/g,
        replacement: "[MAILCHIMP_API_KEY]",
    },
    {
        regexp: /\bAK[0-9A-Z]{18}\b/g,
        replacement: "[AMAZON_ACCESS_KEY]",
    },
    {
        regexp: /\b(https?:\/\/)(?:v1\.)?[a-f0-9]{40}((?::x-oauth-basic)?@)/g,
        replacement: "$1[GITHUB_TOKEN]$2",
    },
    {
        // https://perishablepress.com/stop-using-unsafe-characters-in-urls/
        // https://www.ietf.org/rfc/rfc3986.txt
        regexp: /\b((?:ht|f|sm)tps?:\/\/[^:/?#\[\]@""<>{}|\\^``\s]+:)[^:/?#\[\]@""<>{}|\\^``\s]+@/g,
        replacement: "$1[URL_PASSWORD]@",
    },
];

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
        auth: "https://api.atomist.com/v2/auth",
    },
    http: {
        enabled: true,
        host: "0.0.0.0",
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
        client: {
            factory: DefaultWebSocketFactory,
        },
        termination: {
            graceful: false,
            gracePeriod: defaultGracePeriod,
        },
        compress: false,
        timeout: 30000,
        lifecycle: new QueuingWebSocketLifecycle(),
    } as any,
    graphql: {
        client: {
            factory: DefaultGraphClientFactory,
        },
    },
    applicationEvents: {
        enabled: false,
    },
    cluster: {
        enabled: false,
    },
    logging: {
        level: "info",
        callsite: false,
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
        client: {
            factory: DefaultStatsDClientFactory,
        },
    },
    redact: {
        log: true,
        messages: true,
        patterns: DEFAULT_REDACTION_PATTERNS,
    },
    commands: undefined,
    events: undefined,
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
