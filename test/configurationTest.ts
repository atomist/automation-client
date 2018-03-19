import "mocha";
import * as assert from "power-assert";

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
    resolveConfigurationValue,
    resolveModuleConfig,
    resolveTeamIds,
    resolveToken,
    UserConfig,
} from "../src/configuration";

describe("configuration", () => {

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
            file: false,
            banner: true,
        },
        statsd: {
            enabled: false,
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
                token: "the0con",
                teamIds: ["TVAPOR", "TSIRE", "TWARNERBROS"],
                modules: [
                    { name: "@gainst/me", token: "Borne of the FM Waves of the Heart" },
                ],
            };
            const moduleConfig = resolveModuleConfig(userConfig, "@tegan/sara");
            assert(moduleConfig.token === userConfig.token);
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
            assert(moduleConfig.token === userConfig.token);
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
            assert(moduleConfig.token === userConfig.token);
            assert.deepStrictEqual(moduleConfig.teamIds, ["TVAPOR"]);
        });

        it("should return nothing", () => {
            const userConfig: UserConfig = {};
            const moduleConfig = resolveModuleConfig(userConfig);
            assert(moduleConfig.token === undefined);
            assert(moduleConfig.teamIds === undefined);
        });

        it("should handled undefined", () => {
            const moduleConfig = resolveModuleConfig(undefined);
            assert(moduleConfig.token === undefined);
            assert(moduleConfig.teamIds === undefined);
        });

        it("should handled null", () => {
            const moduleConfig = resolveModuleConfig(null);
            assert(moduleConfig.token === undefined);
            assert(moduleConfig.teamIds === undefined);
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

        it("should warn but return nothing", () => {
            const c = loadAutomationConfig("/this/file/should/not/exist/so/please/do/not/make/it");
            assert.deepStrictEqual(c, {});
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
            assert(c.name === "@atomist/automation-node-tests");
            assert(c.version === "0.0.7");
            assert.deepStrictEqual(c.teamIds, ["T1L0VDKJP"]);
            assert.deepStrictEqual(c.keywords, ["test", "automation"]);
            assert(c.ws.enabled === true);
            assert(c.ws.termination.graceful === false);
            assert(c.ws.compress === true);
            assert(c.http.enabled === true);
            assert(c.http.auth.basic.enabled === false);
            assert(c.http.auth.basic.username === "test");
            assert(c.http.auth.basic.password === "test");
            assert(c.http.auth.bearer.enabled === true);
            assert(c.http.auth.bearer.adminOrg === "atomisthq");
            assert(c.applicationEvents.enabled === true);
            assert(c.applicationEvents.teamId === "T1L0VDKJP");
            assert(c.cluster.enabled === false);
        }).timeout(5000);

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
            assert(ts === undefined);
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
            assert(c === "here");
        });

        it("should not care if config does not exist if environment variable does", () => {
            const c = resolveConfigurationValue(["HOME"], ["should.not.exist.at.all"], "no");
            assert(c === process.env.HOME);
        });

        it("should find nothing in the environment", () => {
            const c = resolveConfigurationValue(["BLAH_BLAH_BLAH"], ["targetOwner"], "no");
            assert(c === "johnsonr");
        });

        it("should take environment over config", () => {
            const c = resolveConfigurationValue(["HOME"], ["targetOwner"], "no");
            assert(c === process.env.HOME);
        });

        it("should take environment over config", () => {
            const c = resolveConfigurationValue(["HOME"], ["targetOwner"], "no");
            assert(c === process.env.HOME);
        });

        it("should take first environment match", () => {
            const c = resolveConfigurationValue(["HOME", "PATH"], ["targetOwner"], "no");
            assert(c === process.env.HOME);
        });

        it("should take first config match", () => {
            const c = resolveConfigurationValue(["BLAH_BLAH_BLAH", "NO_NO_NO"], ["targetOwner", "repo"], "no");
            assert(c === "johnsonr");
        });

    });

    describe("resolveToken", () => {

        it("should return undefined", () => {
            const save = process.env.GITHUB_TOKEN;
            if (save) {
                delete process.env.GITHUB_TOKEN;
            }
            const c = resolveToken({});
            assert(c === undefined);
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
            assert(c === t);
            if (save) {
                process.env.GITHUB_TOKEN = save;
            }
        });

        it("should find the token in ATOMIST_TOKEN", () => {
            const save = process.env.ATOMIST_TOKEN;
            const t = "not-a-real-token";
            process.env.ATOMIST_TOKEN = t;
            const c = resolveToken({});
            assert(c === t);
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
            assert(c === t);
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
            assert(c === t);
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

        it("should throw an exception for no teamIds or groups", async () => {
            const save = process.env.HOME;
            process.env.HOME = "/throw/loadConfiguration/off/the/trail";
            try {
                await loadConfiguration("/this/path/does/not/exist/i/hope");
                assert.fail("Failed to throw an exception");
            } catch (e) {
                assert(e.message.includes("teamIds or groups"));
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
                await loadConfiguration("/this/path/does/not/exist/i/hope");
                assert.fail("Failed to throw an exception");
            } catch (e) {
                assert(e.message === `cannot specify both teamIds (["A"]) and groups (["G"])`);
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
            const c = await loadConfiguration("/this/path/does/not/exist/i/hope");
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

});
