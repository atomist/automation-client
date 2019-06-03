import * as appRoot from "app-root-path";
import * as fs from "fs-extra";
import * as stringify from "json-stringify-safe";
import * as _ from "lodash";
import * as path from "path";
import * as assert from "power-assert";
import * as tmp from "tmp-promise";

import {
    AutomationServerOptions,
    Configuration,
    configurationValue,
    DEFAULT_REDACTION_PATTERNS,
    defaultConfiguration,
    loadAtomistConfig,
    loadAtomistConfigPath,
    loadAutomationConfig,
    loadConfiguration,
    loadIndexConfig,
    loadUserConfiguration,
    LocalDefaultConfiguration,
    mergeConfigs,
    ProductionDefaultConfiguration,
    resolveConfigurationValue,
    resolveEnvironmentVariables,
    resolveModuleConfig,
    resolvePlaceholders,
    resolveWorkspaceIds,
    TestingDefaultConfiguration,
    UserConfig,
} from "../lib/configuration";
import { QueuingWebSocketLifecycle } from "../lib/internal/transport/websocket/WebSocketLifecycle";
import { DefaultGraphClientFactory } from "../lib/spi/graph/GraphClientFactory";
import { DefaultHttpClientFactory } from "../lib/spi/http/httpClient";
import { DefaultWebSocketFactory } from "../lib/spi/http/wsClient";
import { DefaultStatsDClientFactory } from "../lib/spi/statsd/statsdClient";

/* tslint:disable:max-file-line-count */

describe("configuration", () => {

    before(() => {
        for (const key in process.env) {
            if (process.env.hasOwnProperty(key) && key.startsWith("ATOMIST_")) {
                delete process.env[key];
            }
        }
        delete process.env.NODE_ENV;
        process.stdout.write(JSON.stringify(process.env));
    });

    // tslint:disable-next-line:no-var-requires
    const pkgVersion = require(__dirname + "/../package.json").version;
    const defCfg: Configuration = {
        name: "@atomist/automation-client",
        version: pkgVersion,
        keywords: ["atomist", "automation"],
        workspaceIds: [],
        groups: [],
        environment: "local",
        application: "automation-client",
        policy: "ephemeral",
        endpoints: {
            api: "https://automation.atomist.com/registration",
            graphql: "https://automation.atomist.com/graphql/team",
            auth: "https://api.atomist.com/v2/auth",
        },
        http: {
            enabled: true,
            host: "127.0.0.1",
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
            timeout: 30000,
            client: {
                factory: DefaultWebSocketFactory,
            },
            lifecycle: new QueuingWebSocketLifecycle(),
        } as any,
        graphql: {
            client: {
                factory: DefaultGraphClientFactory,
            },
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
        redact: {
            log: true,
            messages: true,
            patterns: DEFAULT_REDACTION_PATTERNS,
        },
        statsd: {
            enabled: false,
            client: {
                factory: DefaultStatsDClientFactory,
            },
        },
        applicationEvents: {
            enabled: false,
        },
        commands: undefined,
        events: undefined,
        ingesters: [],
        listeners: [],
        postProcessors: [],
    };

    describe("resolveModuleConfig", () => {

        it("should use the user default", () => {
            const userConfig: UserConfig = {
                apiKey: "the0con",
                workspaceIds: ["TVAPOR", "TSIRE", "TWARNERBROS"],
                modules: [
                    { name: "@gainst/me", apiKey: "Borne of the FM Waves of the Heart" },
                ],
            };
            const moduleConfig = resolveModuleConfig(userConfig, "@tegan/sara");
            assert.equal(moduleConfig.apiKey, userConfig.apiKey);
            assert.deepStrictEqual(moduleConfig.workspaceIds, userConfig.workspaceIds);
        });

        it("should use the module configuration", () => {
            const userConfig: UserConfig = {
                apiKey: "the0con",
                workspaceIds: ["TVAPOR", "TSIRE", "TWARNERBROS"],
                modules: [
                    { name: "@gainst/me", apiKey: "Borne of the FM Waves of the Heart" },
                    { name: "@tegan/sara", apiKey: "sainthood", workspaceIds: ["TVAPOR"] },
                ],
            };
            const moduleConfig = resolveModuleConfig(userConfig, "@tegan/sara");
            const e = { apiKey: "sainthood", workspaceIds: ["TVAPOR"] };
            assert.deepStrictEqual(moduleConfig, e);
        });

        it("should get the apiKey from the module configuration", () => {
            const userConfig: UserConfig = {
                apiKey: "the0con",
                workspaceIds: ["TVAPOR", "TSIRE", "TWARNERBROS"],
                modules: [
                    { name: "@gainst/me", apiKey: "Borne of the FM Waves of the Heart" },
                    { name: "@tegan/sara", apiKey: "sainthood" },
                ],
            };
            const moduleConfig = resolveModuleConfig(userConfig, "@tegan/sara");
            const e = { apiKey: "sainthood", workspaceIds: ["TVAPOR", "TSIRE", "TWARNERBROS"] };
            assert.deepStrictEqual(moduleConfig, e);
        });

        it("should get the workspaceIds from the module configuration", () => {
            const userConfig: UserConfig = {
                apiKey: "the0con",
                workspaceIds: ["TVAPOR", "TSIRE", "TWARNERBROS"],
                modules: [
                    { name: "@gainst/me", apiKey: "Borne of the FM Waves of the Heart" },
                    { name: "@tegan/sara", workspaceIds: ["TVAPOR"] },
                    { name: "@tegan/sara", workspaceIds: ["TSIRE"] },
                ],
            };
            const moduleConfig = resolveModuleConfig(userConfig, "@tegan/sara");
            assert.equal(moduleConfig.apiKey, userConfig.apiKey);
            assert.deepStrictEqual(moduleConfig.workspaceIds, ["TVAPOR"]);
        });

        it("should get the verion-specific module configuration", () => {
            const userConfig: UserConfig = {
                apiKey: "the0con",
                workspaceIds: ["TVAPOR", "TSIRE", "TWARNERBROS"],
                modules: [
                    { name: "@gainst/me", apiKey: "Borne of the FM Waves of the Heart" },
                    { name: "@tegan/sara", version: "<2.0.0", workspaceIds: ["TSIRE"] },
                    { name: "@tegan/sara", version: "2.x.x", workspaceIds: ["TVAPOR"] },
                    { name: "@tegan/sara", workspaceIds: ["TWARNERBROS"] },
                ],
            };
            const moduleConfig = resolveModuleConfig(userConfig, "@tegan/sara", "2.1.0");
            assert.equal(moduleConfig.apiKey, userConfig.apiKey);
            assert.deepStrictEqual(moduleConfig.workspaceIds, ["TVAPOR"]);
        });

        it("should return nothing", () => {
            const userConfig: UserConfig = {};
            const moduleConfig = resolveModuleConfig(userConfig);
            assert.equal(moduleConfig.apiKey, undefined);
            assert.equal(moduleConfig.workspaceIds, undefined);
        });

        it("should handled undefined", () => {
            const moduleConfig = resolveModuleConfig(undefined);
            assert.equal(moduleConfig.apiKey, undefined);
            assert.equal(moduleConfig.workspaceIds, undefined);
        });

        it("should handled null", () => {
            // tslint:disable-next-line:no-null-keyword
            const moduleConfig = resolveModuleConfig(null);
            assert.equal(moduleConfig.apiKey, undefined);
            assert.equal(moduleConfig.workspaceIds, undefined);
        });

    });

    describe("loadDefaultConfiguration", () => {

        it("should return the default", () => {
            const c = defaultConfiguration();
            assert.deepStrictEqual(c, defCfg);
        });

    });

    describe("loadUserConfiguration", () => {

        it("should warn but return original", () => {
            const save = process.env.HOME;
            process.env.HOME = "/this/file/should/not/exist/so/please/do/not/make/it";
            const c = loadUserConfiguration();
            assert.deepStrictEqual(c, {});
            process.env.HOME = save;
        });

        it("should load the user config", () => {
            const save = process.env.HOME;
            process.env.HOME = path.join(process.cwd(), "test");
            const c = loadUserConfiguration();
            const e = {
                workspaceIds: [
                    "T7GMF5USG",
                ],
                apiKey: "6**************************************2",
                endpoints: {
                    graphql: "https://user.graphql.ep:1313/gql/team",
                    api: "https://user.api.ep:4141/reg",
                },
                environment: "env-user",
                application: "app-user",
            };
            assert.deepStrictEqual(c, e);
            process.env.HOME = save;
        });

        it("should load the module config over user config", () => {
            const save = process.env.HOME;
            process.env.HOME = __dirname;
            const c = loadUserConfiguration("richie", "0.2.1");
            const e = {
                apiKey: "6**************************************2",
                workspaceIds: [
                    "T7GMF5USG",
                    "AT0M1ST01",
                ],
                endpoints: {
                    graphql: "https://user.graphql.ep:1313/gql/team",
                    api: "https://user.api.ep:4141/reg",
                },
                environment: "env-module",
                application: "app-module",
            };
            assert.deepStrictEqual(c, e);
            process.env.HOME = save;
        });

    });

    describe("loadAutomationConfig", () => {

        it("should load from index.js", async () => {
            const root = appRoot.path;
            const indexJs = path.join(root, "test", "index.js");
            const indexUtilJs = path.join(root, "test", "util", "index.js");

            const atomistConfigJs = `exports.configuration = {
    apiKey: "nightclubjitters",
    workspaceIds: ["TIM"],
    http: {
        enabled: false,
        port: 1818,
        host: "atm-cfg-js"
    }
};
`;
            const atomistConfigUtilJs = `exports.configuration = {
    workspaceIds: ["FOO"],
    http: {
        enabled: true,
    }
};
`;
            fs.writeFileSync(indexJs, atomistConfigJs);
            fs.writeFileSync(indexUtilJs, atomistConfigUtilJs);
            const cfg = await loadIndexConfig();
            assert.deepStrictEqual(cfg, JSON.parse(`{
  "apiKey": "nightclubjitters",
  "http": {
    "enabled": true,
    "host": "atm-cfg-js",
    "port": 1818
  },
  "workspaceIds": [
    "TIM",
    "FOO"
  ]
}`));
            fs.removeSync(indexJs);
            fs.removeSync(indexUtilJs);
        });

        it("should load async from index.js", async () => {

            const root = appRoot.path;
            const indexJs = path.join(root, "test", "index.js");
            delete require.cache[require.resolve(indexJs)];
            const asyncConfigJs = path.join(root, "test", "asyncConfig.js");

            fs.copyFileSync(asyncConfigJs, indexJs);
            const cfg = await loadIndexConfig();
            assert.deepStrictEqual(cfg, JSON.parse(`{
  "name": "asyn-test",
  "workspaceIds": [
    "123456"
  ]
}`));
            fs.removeSync(indexJs);
        });

        it("should throw error for missing config", async () => {
            const p = "/this/file/should/not/exist/so/please/do/not/make/it";
            const re = new RegExp(`Failed to load ${p}.configuration: Cannot find module '${p}'`);
            try {
                await loadAutomationConfig(p);
            } catch (e) {
                assert(re.test(e.message));
            }
        });

        it("should load provided path", async () => {
            const e: Configuration = {
                apiKey: "nightclubjitters",
                workspaceIds: ["TIM"],
                http: {
                    enabled: false,
                    port: 1818,
                    host: "atm-cfg-js",
                },
            };
            const atomistConfigJs = `exports.configuration = {
    apiKey: "nightclubjitters",
    workspaceIds: ["TIM"],
    http: {
        enabled: false,
        port: 1818,
        host: "atm-cfg-js"
    }
};
`;
            const atomistConfigJsFile = tmp.fileSync();
            fs.writeFileSync(atomistConfigJsFile.name, atomistConfigJs);
            const c = await loadAutomationConfig(atomistConfigJsFile.name);
            assert.deepStrictEqual(c, e);
        });

        it("should find the test automation config", async () => {
            const c = await loadAutomationConfig();
            assert.equal(c.name, "@atomist/automation-node-tests");
            assert.equal(c.version, "0.0.7");
            assert.deepStrictEqual(c.workspaceIds, ["T1L0VDKJP"]);
            assert.deepStrictEqual(c.keywords, ["test", "automation"]);
            assert.equal(c.ws.enabled, true);
            assert.equal(c.ws.termination.graceful, false);
            assert.equal(c.ws.compress, true);
            assert.equal(c.http.enabled, true);
            assert.equal(c.http.auth.basic.enabled, false);
            assert.equal(c.http.auth.basic.username, "test");
            assert.equal(c.http.auth.basic.password, "test");
            assert.equal(c.http.auth.bearer.enabled, true);
            assert.equal(c.http.auth.bearer.adminOrg, "atomisthq");
            assert.equal(c.applicationEvents.enabled, true);
            assert.equal(c.applicationEvents.workspaceId, "T1L0VDKJP");
            assert.equal(c.cluster.enabled, false);
        });

    });

    describe("loadAtomistConfigPath", () => {

        it("should do nothing", () => {
            const save = process.env.ATOMIST_CONFIG_PATH;
            if (save) {
                delete process.env.ATOMIST_CONFIG_PATH;
            }
            const c = loadAtomistConfigPath();
            assert.deepStrictEqual(c, {});
            if (save) {
                process.env.ATOMIST_CONFIG_PATH = save;
            }
        });

        it("should load config", () => {
            const e: AutomationServerOptions = {
                name: "@atomist/temp-test",
                version: "3.1.4",
            };
            const tmpFile = tmp.fileSync();
            fs.writeJSONSync(tmpFile.name, e);
            const save = process.env.ATOMIST_CONFIG_PATH;
            process.env.ATOMIST_CONFIG_PATH = tmpFile.name;
            const c = loadAtomistConfigPath();
            assert.deepStrictEqual(c, e);
            if (save) {
                process.env.ATOMIST_CONFIG_PATH = save;
            } else {
                delete process.env.ATOMIST_CONFIG_PATH;
            }
        });

    });

    describe("loadAtomistConfig", () => {

        it("should do nothing", () => {
            const save = process.env.ATOMIST_CONFIG;
            if (save) {
                delete process.env.ATOMIST_CONFIG;
            }
            const c = loadAtomistConfig();
            assert.deepStrictEqual(c, {});
            if (save) {
                process.env.ATOMIST_CONFIG = save;
            }
        });

        it("should load config", () => {
            const e: AutomationServerOptions = {
                name: "@atomist/temp-test",
                version: "3.1.4",
            };
            const save = process.env.ATOMIST_CONFIG;
            process.env.ATOMIST_CONFIG = stringify(e);
            const c = loadAtomistConfig();
            assert.deepStrictEqual(c, { name: "@atomist/temp-test", version: "3.1.4" });
            if (save) {
                process.env.ATOMIST_CONFIG = save;
            } else {
                delete process.env.ATOMIST_CONFIG;
            }
        });

    });

    describe("resolveWorkspaceIds", () => {

        it("should fall through to the default", () => {
            const saveTeams = process.env.ATOMIST_WORKSPACES;
            delete process.env.ATOMIST_WORKSPACES;
            const ts = resolveWorkspaceIds({ workspaceIds: ["thing1", "thing2"] });
            assert.deepStrictEqual(ts, ["thing1", "thing2"]);
            if (saveTeams) {
                process.env.ATOMIST_WORKSPACES = saveTeams;
            }
        });

        it("should return nothing", () => {
            const saveTeams = process.env.ATOMIST_WORKSPACES;
            delete process.env.ATOMIST_WORKSPACES;
            const ts = resolveWorkspaceIds({});
            assert.equal(ts, undefined);
            if (saveTeams) {
                process.env.ATOMIST_WORKSPACES = saveTeams;
            }
        });

        it("should parse ATOMIST_WORKSPACES", () => {
            const save = process.env.ATOMIST_WORKSPACES;
            const e = "thing1,thing2";
            process.env.ATOMIST_WORKSPACES = e;
            const ts = resolveWorkspaceIds({});
            assert.deepStrictEqual(ts, ["thing1", "thing2"]);
            if (save) {
                process.env.ATOMIST_WORKSPACES = save;
            } else {
                delete process.env.ATOMIST_WORKSPACES;
            }
        });

    });

    describe("resolveConfigurationValue", () => {

        it("should fall to the default", () => {
            const c = resolveConfigurationValue(["NONSENSICAL_NONSENSE"], ["should.not.exist.at.all"], "here");
            assert.equal(c, "here");
        });

        it("should not care if config does not exist if environment variable does", () => {
            const c = resolveConfigurationValue(["HOME"], ["should.not.exist.at.all"], "no");
            assert.equal(c, process.env.HOME);
        });

        it("should find nothing in the environment", () => {
            const c = resolveConfigurationValue(["BLAH_BLAH_BLAH"], ["targetOwner"], "no");
            assert.equal(c, "johnsonr");
        });

        it("should take environment over config", () => {
            const c = resolveConfigurationValue(["HOME"], ["targetOwner"], "no");
            assert.equal(c, process.env.HOME);
        });

        it("should take environment over config", () => {
            const c = resolveConfigurationValue(["HOME"], ["targetOwner"], "no");
            assert.equal(c, process.env.HOME);
        });

        it("should take first environment match", () => {
            const c = resolveConfigurationValue(["HOME", "PATH"], ["targetOwner"], "no");
            assert.equal(c, process.env.HOME);
        });

        it("should take first config match", () => {
            const c = resolveConfigurationValue(["BLAH_BLAH_BLAH", "NO_NO_NO"], ["targetOwner", "repo"], "no");
            assert.equal(c, "johnsonr");
        });

    });

    describe("loadConfiguration", () => {

        const emptyConfig = path.join(appRoot.path, "test", "empty.config.js");

        it("should throw an exception for no workspaceIds or groups", async () => {
            const save = process.env.HOME;
            process.env.HOME = "/throw/loadConfiguration/off/the/trail";
            try {
                await loadConfiguration(emptyConfig);
                assert.fail("Failed to throw an exception");
            } catch (e) {
                assert(e.message.includes("you must either provide an array of 'groups' in your configuration or,"));
            }
            process.env.HOME = save;
        });

        it("should throw an exception for both workspaceIds or groups", async () => {
            const save: { [key: string]: string } = {};
            save.HOME = process.env.HOME;
            process.env.HOME = "/throw/loadConfiguration/off/the/trail";
            save.ATOMIST_CONFIG = process.env.ATOMIST_CONFIG;
            process.env.ATOMIST_CONFIG = stringify({ apiKey: "x", workspaceIds: ["A"], groups: ["G"] });
            try {
                await loadConfiguration(emptyConfig);
                assert.fail("Failed to throw an exception");
            } catch (e) {
                assert(e.message.includes(`cannot specify both 'workspaceIds' and 'groups'`));
            }
            _.forEach(save, (v, k) => {
                if (v) {
                    process.env[k] = v;
                } else {
                    delete process.env[k];
                }
            });
        });

        it("should load config", async () => {
            const save: { [key: string]: string } = {};
            save.HOME = process.env.HOME;
            process.env.HOME = "/throw/loadConfiguration/off/the/trail";
            const cfg: Configuration = {
                apiKey: "bogus",
                workspaceIds: ["non-team"],
            };
            save.ATOMIST_CONFIG = process.env.ATOMIST_CONFIG;
            process.env.ATOMIST_CONFIG = stringify(cfg);
            const e = _.cloneDeep(defCfg);
            e.apiKey = "bogus";
            e.workspaceIds = ["non-team"];
            const c = await loadConfiguration(emptyConfig);
            assert.deepStrictEqual(c, e);
            _.forEach(save, (v, k) => {
                if (v) {
                    process.env[k] = v;
                } else {
                    delete process.env[k];
                }
            });
        });

        it("should properly merge all configs", async () => {
            const save: { [key: string]: string } = {};
            // user config
            save.HOME = process.env.HOME;
            process.env.HOME = path.join(process.cwd(), "test");

            // automation config
            const atomistConfigJs = `exports.configuration = {
    http:{
        enabled: false,
        port: 1818,
        host: "atm-cfg-js"
    },
    postProcessors: [
            config => {
            config.custom = { test: "123456" };
            return Promise.resolve(config);
        },
    ],
};
`;
            const atomistConfigJsFile = tmp.fileSync();
            fs.writeFileSync(atomistConfigJsFile.name, atomistConfigJs);

            // ATOMIST_CONFIG_PATH
            save.ATOMIST_CONFIG_PATH = process.env.ATOMIST_CONFIG_PATH;
            const atomistConfigPath: Configuration = {
                apiKey: "bad-key",
                cluster: {
                    enabled: true,
                    workers: 2,
                },
                ws: {
                    enabled: true,
                    termination: {
                        graceful: true,
                        gracePeriod: 3000,
                    },
                },
            };
            const atomistConfigPathFile = tmp.fileSync();
            fs.writeJSONSync(atomistConfigPathFile.name, atomistConfigPath);
            process.env.ATOMIST_CONFIG_PATH = atomistConfigPathFile.name;

            // ATOMIST_CONFIG
            save.ATOMIST_CONFIG = process.env.ATOMIST_CONFIG;
            const atomistConfig: Configuration = {
                apiKey: "lizphairexileinguyville",
                ws: {
                    enabled: true,
                    compress: true,
                    termination: {
                        graceful: true,
                        gracePeriod: 30,
                    },
                },
            };
            process.env.ATOMIST_CONFIG = stringify(atomistConfig);

            // ATOMIST_WORKSPACES
            save.ATOMIST_WORKSPACES = process.env.ATOMIST_WORKSPACES;
            process.env.ATOMIST_WORKSPACES = "T61,HELPMEMARY,GLORY";

            const c = await loadConfiguration(atomistConfigJsFile.name);
            const e = _.cloneDeep(defCfg);
            e.endpoints.graphql = "https://user.graphql.ep:1313/gql/team";
            e.endpoints.api = "https://user.api.ep:4141/reg";
            e.environment = "env-module-load";
            e.application = "app-module-load";
            e.policy = "durable";
            e.http.enabled = false;
            e.http.port = 1818;
            e.http.host = "host-module";
            e.ws.compress = true;
            e.ws.termination.graceful = true;
            e.ws.termination.gracePeriod = 30;
            e.cluster.enabled = true;
            e.cluster.workers = 2;
            e.workspaceIds = ["T61", "HELPMEMARY", "GLORY"];
            e.apiKey = "lizphairexileinguyville";
            e.custom = { test: "123456" };

            assert.deepStrictEqual(c, e);

            _.forEach(save, (v, k) => {
                if (v) {
                    process.env[k] = v;
                } else {
                    delete process.env[k];
                }
            });
        });

    });

    describe("loadDefaultConfiguration", () => {

        it("should default null to local config", () => {
            // tslint:disable-next-line:no-null-keyword
            assertEnvConfiguration(null, LocalDefaultConfiguration);
        });

        it("should default undefined to local config", () => {
            assertEnvConfiguration(undefined, LocalDefaultConfiguration);
        });

        it("should default testing config", () => {
            assertEnvConfiguration("testing", TestingDefaultConfiguration);
        });

        it("should default production config", () => {
            assertEnvConfiguration("production", ProductionDefaultConfiguration);
        });

        function assertEnvConfiguration(env: string, envSpecificCfg: Configuration): void {
            const oldEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = env;

            const cfg = defaultConfiguration();

            delete cfg.name;
            delete cfg.version;
            delete cfg.keywords;
            delete cfg.application;

            const localCfg = LocalDefaultConfiguration;
            assert.deepStrictEqual(cfg, mergeConfigs(localCfg, envSpecificCfg));

            process.env.NODE_ENV = oldEnv;
        }
    });

    describe("resolvePlaceholders", () => {

        it("should resolve simple placeholder", async () => {
            const c = defaultConfiguration();
            c.custom = {
                // tslint:disable-next-line:no-invalid-template-strings
                foo: "${BAR}",
            };

            process.env.BAR = "foo";
            await resolvePlaceholders(c);
            delete process.env.BAR;

            assert.equal(c.custom.foo, "foo");
        });

        it("should resolve simple placeholder and apply default value", async () => {
            const c = defaultConfiguration();
            c.custom = {
                // tslint:disable-next-line:no-invalid-template-strings
                foo: "${BAR:super foo}",
            };

            delete process.env.BAR;
            await resolvePlaceholders(c);

            assert.equal(c.custom.foo, "super foo");
        });

        it("should resolve simple placeholder and not apply default value", async () => {
            const c = defaultConfiguration();
            c.custom = {
                // tslint:disable-next-line:no-invalid-template-strings
                foo: "${BAR:super foo}",
            };

            process.env.BAR = "kung fu";
            await resolvePlaceholders(c);
            delete process.env.BAR;

            assert.equal(c.custom.foo, "kung fu");
        });

        it("should resolve multiple placeholders", async () => {
            const c = defaultConfiguration();
            c.custom = {
                // tslint:disable-next-line:no-invalid-template-strings
                foo: "Careful ${DUDE }, there's a ${DRINK:beverage} here!",
            };

            process.env.DUDE = "Man";
            await resolvePlaceholders(c);
            delete process.env.DUDE;

            assert.equal(c.custom.foo, "Careful Man, there's a beverage here!");
        });

        it("should fail if placeholder can't be resolved", async () => {
            const c = defaultConfiguration();
            c.custom = {
                // tslint:disable-next-line:no-invalid-template-strings
                foo: "Careful ${DUDE }, there's a ${DRINK:beverage} here!",
            };
            delete process.env.DUDE;
            try {
                await resolvePlaceholders(c);
                assert.fail();
            } catch (err) {
                // ignore
            }
        });

    });

    describe("resolveEnvironmentVariables", () => {

        it("should resolve simple env var", () => {
            const c = defaultConfiguration();

            process.env.ATOMIST_custom_foo_bar = "bla";
            resolveEnvironmentVariables(c);
            delete process.env.ATOMIST_custom_foo_bar;

            assert.equal(c.custom.foo.bar, "bla");
        });

        it("should resolve multiple env vars", () => {
            const c = defaultConfiguration();

            process.env.ATOMIST_custom_foo_bar = "bla";
            process.env.ATOMIST_apiKey = "some token";
            resolveEnvironmentVariables(c);
            delete process.env.ATOMIST_custom_foo_bar;
            delete process.env.ATOMIST_apiKey;

            assert.equal(c.custom.foo.bar, "bla");
            assert.equal(c.apiKey, "some token");
        });

    });

    describe("configurationValue", () => {

        it("should resolve simple config value", () => {
            (global as any).__runningAutomationClient = {
                configuration: {
                    test: {
                        foo: "bla",
                    },
                },
            };
            const v = configurationValue<string>("test.foo");
            assert.equal(v, "bla");
        });

        it("should resolve simple config value from default", () => {
            (global as any).__runningAutomationClient = {
                configuration: {},
            };
            const v = configurationValue<string>("test.foo", "bla");
            assert.equal(v, "bla");
        });

        it("should resolve simple config value from null", () => {
            (global as any).__runningAutomationClient = {
                configuration: {},
            };
            /* tslint:disable:no-null-keyword */
            const v = configurationValue<string>("test.foo", null);
            assert.equal(v, null);
            /* tslint:enable:no-null-keyword */
        });

        it("should resolve boolean config value from false", () => {
            (global as any).__runningAutomationClient = {
                configuration: {
                    sdm: {
                        build: {
                            tag: false,
                        },
                    },
                },
            };
            const v = configurationValue<boolean>("sdm.build.tag", true);
            assert.equal(v, false);
        });

        it("should resolve the entire configuration", () => {
            (global as any).__runningAutomationClient = {
                configuration: {
                    sdm: {
                        build: {
                            tag: false,
                        },
                    },
                },
            };
            const v = configurationValue<Configuration>();
            assert.deepStrictEqual(v, (global as any).__runningAutomationClient.configuration);
        });

        it("should fall back to empty string default value", () => {
            const v = configurationValue<string>("foo.bar", "");
            assert.deepStrictEqual(v, "");
        });

        it("should throw an error if config not found and no default provided", () => {
            (global as any).__runningAutomationClient = {
                configuration: {},
            };
            assert.throws(() => configurationValue<string>("test.foo"), /Required @Value 'test.foo' not available/);
        });

    });
});
