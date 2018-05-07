import "mocha";
import * as assert from "power-assert";

import * as appRoot from "app-root-path";
import * as fs from "fs-extra";
import * as stringify from "json-stringify-safe";
import * as _ from "lodash";
import * as path from "path";
import * as tmp from "tmp-promise";

import {
    AutomationServerOptions,
    Configuration,
    defaultConfiguration,
    loadAtomistConfig,
    loadAtomistConfigPath,
    loadAutomationConfig,
    loadConfiguration,
    loadUserConfiguration,
    LocalDefaultConfiguration,
    mergeConfigs,
    ProductionDefaultConfiguration,
    resolveConfigurationValue,
    resolveEnvironmentVariables,
    resolveModuleConfig,
    resolvePlaceholders,
    resolveTeamIds,
    resolveToken,
    TestingDefaultConfiguration,
    UserConfig,
} from "../src/configuration";

describe("configuration", () => {

    before(() => {
        delete process.env.ATOMIST_CONFIG_PATH;
        delete process.env.ATOMIST_CONFIG;
        delete process.env.ATOMIST_TEAM;
        delete process.env.ATOMIST_TEAMS;
    })

    // tslint:disable-next-line:no-var-requires
    const pkgVersion = require(__dirname + "/../package.json").version;
    const defCfg: Configuration = {
        name: "@atomist/automation-client",
        version: pkgVersion,
        keywords: ["atomist", "automation"],
        teamIds: [],
        groups: [],
        environment: "local",
        application: "automation-client",
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
                    enabled: false,
                },
                bearer: {
                    enabled: false,
                },
            },
            customizers: [],
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
        cluster: {
            enabled: false,
        },
        logging: {
            level: "debug",
            file: {
                enabled: true,
                level: "debug",
            },
            banner: true,
            logEvents: {
                enabled: true,
            },
        },
        statsd: {
            enabled: false,
        },
        applicationEvents: {
            enabled: false,
        },
        commands: null,
        events: null,
        ingesters: [],
        listeners: [],
        postProcessors: [],
    };

    describe("resolveModuleConfig", () => {

        it("should use the user default", () => {
            const userConfig: UserConfig = {
                token: "the0con",
                teamIds: ["TVAPOR", "TSIRE", "TWARNERBROS"],
                modules: [
                    { name: "@gainst/me", token: "Borne of the FM Waves of the Heart" },
                ],
            };
            const moduleConfig = resolveModuleConfig(userConfig, "@tegan/sara");
            assert.equal(moduleConfig.token, userConfig.token);
            assert.deepStrictEqual(moduleConfig.teamIds, userConfig.teamIds);
        });

        it("should use the module configuration", () => {
            const userConfig: UserConfig = {
                token: "the0con",
                teamIds: ["TVAPOR", "TSIRE", "TWARNERBROS"],
                modules: [
                    { name: "@gainst/me", token: "Borne of the FM Waves of the Heart" },
                    { name: "@tegan/sara", token: "sainthood", teamIds: ["TVAPOR"] },
                ],
            };
            const moduleConfig = resolveModuleConfig(userConfig, "@tegan/sara");
            const e = { token: "sainthood", teamIds: ["TVAPOR"] };
            assert.deepStrictEqual(moduleConfig, e);
        });

        it("should get the token from the module configuration", () => {
            const userConfig: UserConfig = {
                token: "the0con",
                teamIds: ["TVAPOR", "TSIRE", "TWARNERBROS"],
                modules: [
                    { name: "@gainst/me", token: "Borne of the FM Waves of the Heart" },
                    { name: "@tegan/sara", token: "sainthood" },
                ],
            };
            const moduleConfig = resolveModuleConfig(userConfig, "@tegan/sara");
            const e = { token: "sainthood", teamIds: ["TVAPOR", "TSIRE", "TWARNERBROS"] };
            assert.deepStrictEqual(moduleConfig, e);
        });

        it("should get the teamIds from the module configuration", () => {
            const userConfig: UserConfig = {
                token: "the0con",
                teamIds: ["TVAPOR", "TSIRE", "TWARNERBROS"],
                modules: [
                    { name: "@gainst/me", token: "Borne of the FM Waves of the Heart" },
                    { name: "@tegan/sara", teamIds: ["TVAPOR"] },
                    { name: "@tegan/sara", teamIds: ["TSIRE"] },
                ],
            };
            const moduleConfig = resolveModuleConfig(userConfig, "@tegan/sara");
            assert.equal(moduleConfig.token, userConfig.token);
            assert.deepStrictEqual(moduleConfig.teamIds, ["TVAPOR"]);
        });

        it("should get the verion-specific module configuration", () => {
            const userConfig: UserConfig = {
                token: "the0con",
                teamIds: ["TVAPOR", "TSIRE", "TWARNERBROS"],
                modules: [
                    { name: "@gainst/me", token: "Borne of the FM Waves of the Heart" },
                    { name: "@tegan/sara", version: "<2.0.0", teamIds: ["TSIRE"] },
                    { name: "@tegan/sara", version: "2.x.x", teamIds: ["TVAPOR"] },
                    { name: "@tegan/sara", teamIds: ["TWARNERBROS"] },
                ],
            };
            const moduleConfig = resolveModuleConfig(userConfig, "@tegan/sara", "2.1.0");
            assert.equal(moduleConfig.token, userConfig.token);
            assert.deepStrictEqual(moduleConfig.teamIds, ["TVAPOR"]);
        });

        it("should return nothing", () => {
            const userConfig: UserConfig = {};
            const moduleConfig = resolveModuleConfig(userConfig);
            assert.equal(moduleConfig.token, undefined);
            assert.equal(moduleConfig.teamIds, undefined);
        });

        it("should handled undefined", () => {
            const moduleConfig = resolveModuleConfig(undefined);
            assert.equal(moduleConfig.token, undefined);
            assert.equal(moduleConfig.teamIds, undefined);
        });

        it("should handled null", () => {
            const moduleConfig = resolveModuleConfig(null);
            assert.equal(moduleConfig.token, undefined);
            assert.equal(moduleConfig.teamIds, undefined);
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
                teamIds: [
                    "T7GMF5USG",
                ],
                token: "6**************************************2",
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
                token: "6**************************************2",
                teamIds: [
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

        it("should throw error for missing config", () => {
            const p = "/this/file/should/not/exist/so/please/do/not/make/it";
            const re = new RegExp(`Failed to load ${p}.configuration: Cannot find module '${p}'`);
            assert.throws(() => loadAutomationConfig(p), re);
        });

        it("should load provided path", () => {
            const e: Configuration = {
                token: "nightclubjitters",
                teamIds: ["TIM"],
                http: {
                    enabled: false,
                    port: 1818,
                    host: "atm-cfg-js",
                },
            };
            const atomistConfigJs = `exports.configuration = {
    token: "nightclubjitters",
    teamIds: ["TIM"],
    http: {
        enabled: false,
        port: 1818,
        host: "atm-cfg-js"
    }
};
`;
            const atomistConfigJsFile = tmp.fileSync();
            fs.writeFileSync(atomistConfigJsFile.name, atomistConfigJs);
            const c = loadAutomationConfig(atomistConfigJsFile.name);
            assert.deepStrictEqual(c, e);
        });

        it("should find the test automation config", () => {
            const c = loadAutomationConfig();
            assert.equal(c.name, "@atomist/automation-node-tests");
            assert.equal(c.version, "0.0.7");
            assert.deepStrictEqual(c.teamIds, ["T1L0VDKJP"]);
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
            assert.equal(c.applicationEvents.teamId, "T1L0VDKJP");
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

    describe("resolveTeamIds", () => {

        it("should fall through to the default", () => {
            const saveTeams = process.env.ATOMIST_TEAMS;
            const saveTeam = process.env.ATOMIST_TEAM;
            delete process.env.ATOMIST_TEAMS;
            delete process.env.ATOMIST_TEAM;
            const ts = resolveTeamIds({ teamIds: ["thing1", "thing2"] });
            assert.deepStrictEqual(ts, ["thing1", "thing2"]);
            if (saveTeams) {
                process.env.ATOMIST_TEAMS = saveTeams;
            }
            if (saveTeam) {
                process.env.ATOMIST_TEAM = saveTeam;
            }
        });

        it("should return nothing", () => {
            const saveTeams = process.env.ATOMIST_TEAMS;
            const saveTeam = process.env.ATOMIST_TEAM;
            delete process.env.ATOMIST_TEAMS;
            delete process.env.ATOMIST_TEAM;
            const ts = resolveTeamIds({});
            assert.equal(ts, undefined);
            if (saveTeams) {
                process.env.ATOMIST_TEAMS = saveTeams;
            }
            if (saveTeam) {
                process.env.ATOMIST_TEAM = saveTeam;
            }
        });

        it("should parse ATOMIST_TEAMS", () => {
            const save = process.env.ATOMIST_TEAMS;
            const e = "thing1,thing2";
            process.env.ATOMIST_TEAMS = e;
            const ts = resolveTeamIds({});
            assert.deepStrictEqual(ts, ["thing1", "thing2"]);
            if (save) {
                process.env.ATOMIST_TEAMS = save;
            } else {
                delete process.env.ATOMIST_TEAMS;
            }
        });

        it("should use ATOMIST_TEAM", () => {
            const save = process.env.ATOMIST_TEAM;
            const ets = "thing1";
            process.env.ATOMIST_TEAM = ets;
            const ts = resolveTeamIds({});
            assert.deepStrictEqual(ts, ["thing1"]);
            if (save) {
                process.env.ATOMIST_TEAM = save;
            } else {
                delete process.env.ATOMIST_TEAM;
            }
        });

        it("should prefer ATOMIST_TEAMS", () => {
            const saveTeams = process.env.ATOMIST_TEAMS;
            const saveTeam = process.env.ATOMIST_TEAM;
            const e = "thing1,thing2";
            process.env.ATOMIST_TEAMS = e;
            process.env.ATOMIST_TEAM = "no";
            const ts = resolveTeamIds({});
            assert.deepStrictEqual(ts, ["thing1", "thing2"]);
            if (saveTeams) {
                process.env.ATOMIST_TEAMS = saveTeams;
            } else {
                delete process.env.ATOMIST_TEAMS;
            }
            if (saveTeam) {
                process.env.ATOMIST_TEAM = saveTeam;
            } else {
                delete process.env.ATOMIST_TEAM;
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

    describe("resolveToken", () => {

        it("should return undefined", () => {
            const save = process.env.GITHUB_TOKEN;
            if (save) {
                delete process.env.GITHUB_TOKEN;
            }
            const c = resolveToken({});
            assert.equal(c, undefined);
            if (save) {
                process.env.GITHUB_TOKEN = save;
            }
        });

        it("should fall through to the default", () => {
            const save = process.env.GITHUB_TOKEN;
            if (save) {
                delete process.env.GITHUB_TOKEN;
            }
            const t = "not-a-real-token";
            const c = resolveToken({ token: t });
            assert.equal(c, t);
            if (save) {
                process.env.GITHUB_TOKEN = save;
            }
        });

        it("should find the token in ATOMIST_TOKEN", () => {
            const save = process.env.ATOMIST_TOKEN;
            const t = "not-a-real-token";
            process.env.ATOMIST_TOKEN = t;
            const c = resolveToken({});
            assert.equal(c, t);
            if (save) {
                process.env.ATOMIST_TOKEN = save;
            } else {
                delete process.env.ATOMIST_TOKEN;
            }
        });

        it("should find the token in GITHUB_TOKEN", () => {
            const save = process.env.GITHUB_TOKEN;
            const t = "not-a-real-token";
            process.env.GITHUB_TOKEN = t;
            const c = resolveToken({});
            assert.equal(c, t);
            if (save) {
                process.env.GITHUB_TOKEN = save;
            } else {
                delete process.env.GITHUB_TOKEN;
            }
        });

        it("should prefer the token in ATOMIST_TOKEN", () => {
            const saveAT = process.env.ATOMIST_TOKEN;
            const saveGT = process.env.GITHUB_TOKEN;
            const t = "atm-not-a-real-token";
            process.env.ATOMIST_TOKEN = t;
            process.env.GITHUB__TOKEN = "no";
            const c = resolveToken({});
            assert.equal(c, t);
            if (saveAT) {
                process.env.ATOMIST_TOKEN = saveAT;
            } else {
                delete process.env.ATOMIST_TOKEN;
            }
            if (saveGT) {
                process.env.GITHUB_TOKEN = saveGT;
            } else {
                delete process.env.GITHUB_TOKEN;
            }
        });

    });

    describe("loadConfiguration", () => {

        const emptyConfig = path.join(appRoot.path, "build", "test", "empty.config.js");

        it("should throw an exception for no teamIds or groups", async () => {
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

        it("should throw an exception for both teamIds or groups", async () => {
            const save: { [key: string]: string } = {};
            save.HOME = process.env.HOME;
            process.env.HOME = "/throw/loadConfiguration/off/the/trail";
            save.ATOMIST_CONFIG = process.env.ATOMIST_CONFIG;
            process.env.ATOMIST_CONFIG = stringify({ token: "x", teamIds: ["A"], groups: ["G"] });
            try {
                await loadConfiguration(emptyConfig);
                assert.fail("Failed to throw an exception");
            } catch (e) {
                assert(e.message.includes(`cannot specify both 'teamIds' and 'groups'`));
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
            save.GITHUB_TOKEN = process.env.GITHUB_TOKEN;
            if (save.GITHUB_TOKEN) {
                delete process.env.GITHUB_TOKEN;
            }
            const cfg: Configuration = {
                token: "bogus",
                teamIds: ["non-team"],
            };
            save.ATOMIST_CONFIG = process.env.ATOMIST_CONFIG;
            process.env.ATOMIST_CONFIG = stringify(cfg);
            const e = _.cloneDeep(defCfg);
            e.token = "bogus";
            e.teamIds = ["non-team"];
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

            // ATOMIST_TEAMS
            save.ATOMIST_TEAMS = process.env.ATOMIST_TEAMS;
            process.env.ATOMIST_TEAMS = "T61,HELPMEMARY,GLORY";

            // ATOMIST_TOKENS
            save.ATOMIST_TOKEN = process.env.ATOMIST_TOKEN;
            process.env.ATOMIST_TOKEN = "lizphairexileinguyville";

            const c = await loadConfiguration(atomistConfigJsFile.name);
            const e = _.cloneDeep(defCfg);
            e.endpoints.graphql = "https://user.graphql.ep:1313/gql/team";
            e.endpoints.api = "https://user.api.ep:4141/reg";
            e.environment = "env-module-load";
            e.application = "app-module-load";
            e.policy = "durable";
            e.http.enabled = false;
            e.http.port = 1818;
            e.http.host = "atm-cfg-js";
            e.ws.compress = true;
            e.ws.termination.graceful = true;
            e.ws.termination.gracePeriod = 30;
            e.cluster.enabled = true;
            e.cluster.workers = 2;
            e.teamIds = ["T61", "HELPMEMARY", "GLORY"];
            e.token = "lizphairexileinguyville";
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

        it("should default local config", () => {
            assertEnvConfiguration(null, LocalDefaultConfiguration);
        });

        it("should default testing config", () => {
            assertEnvConfiguration("testing", TestingDefaultConfiguration);
        });

        it("should default production config", () => {
            assertEnvConfiguration("production", ProductionDefaultConfiguration);
        });

        function assertEnvConfiguration(env: string, envSpecificCfg: Configuration) {
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

        it("should resolve simple placeholder", () => {
            const c = defaultConfiguration();
            c.custom = {
                foo: "${BAR}",
            };

            process.env.BAR = "foo";
            resolvePlaceholders(c);
            delete process.env.BAR;

            assert.equal(c.custom.foo, "foo");
        });

        it("should resolve simple placeholder and apply default value", () => {
            const c = defaultConfiguration();
            c.custom = {
                foo: "${BAR:super foo}",
            };

            delete process.env.BAR;
            resolvePlaceholders(c);

            assert.equal(c.custom.foo, "super foo");
        });

        it("should resolve simple placeholder and not apply default value", () => {
            const c = defaultConfiguration();
            c.custom = {
                foo: "${BAR:super foo}",
            };

            process.env.BAR = "kung fu";
            resolvePlaceholders(c);
            delete process.env.BAR;

            assert.equal(c.custom.foo, "kung fu");
        });

        it("should resolve multiple placeholders", () => {
            const c = defaultConfiguration();
            c.custom = {
                foo: "Careful ${DUDE }, there's a ${DRINK:beverage} here!",
            };

            process.env.DUDE = "Man";
            resolvePlaceholders(c);
            delete process.env.DUDE;

            assert.equal(c.custom.foo, "Careful Man, there's a beverage here!");
        });

        it("should fail if placeholder can't be resolved", () => {
            const c = defaultConfiguration();
            c.custom = {
                foo: "Careful ${DUDE }, there's a ${DRINK:beverage} here!",
            };
            delete process.env.DUDE;
            assert.throws(() => resolvePlaceholders(c), Error);
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
            process.env.ATOMIST_token = "some token";
            resolveEnvironmentVariables(c);
            delete process.env.ATOMIST_custom_foo_bar;
            delete process.env.ATOMIST_token;

            assert.equal(c.custom.foo.bar, "bla");
            assert.equal(c.token, "some token");
        });

    });
});
