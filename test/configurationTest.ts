import "mocha";
import * as assert from "power-assert";

import { resolveModuleConfig, UserConfig } from "../src/configuration";

describe("configuration", () => {

    describe("resolveModuleConfig", () => {

        it("should use the default", () => {
            const userConfig: UserConfig = {
                token: "the0con",
                teamIds: ["TVAPOR", "TSIRE", "TWARNERBROS"],
                modules: [
                    { name: "@gainst/me", token: "Borne of the FM Waves of the Heart" },
                ],
            };
            const pkgJson = { name: "@tegan/sara" };
            const moduleConfig = resolveModuleConfig(userConfig, pkgJson);
            assert(moduleConfig.token === userConfig.token);
            assert.deepEqual(moduleConfig.teamIds, userConfig.teamIds);
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
            const pkgJson = { name: "@tegan/sara" };
            const moduleConfig = resolveModuleConfig(userConfig, pkgJson);
            assert(moduleConfig.token === userConfig.modules[1].token);
            assert.deepEqual(moduleConfig.teamIds, userConfig.modules[1].teamIds);
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
            const pkgJson = { name: "@tegan/sara" };
            const moduleConfig = resolveModuleConfig(userConfig, pkgJson);
            assert(moduleConfig.token === userConfig.modules[1].token);
            assert.deepEqual(moduleConfig.teamIds, userConfig.teamIds);
        });

        it("should get the teamIds from the module configuration", () => {
            const userConfig: UserConfig = {
                token: "the0con",
                teamIds: ["TVAPOR", "TSIRE", "TWARNERBROS"],
                modules: [
                    { name: "@gainst/me", token: "Borne of the FM Waves of the Heart" },
                    { name: "@tegan/sara", teamIds: ["TVAPOR"] },
                ],
            };
            const pkgJson = { name: "@tegan/sara" };
            const moduleConfig = resolveModuleConfig(userConfig, pkgJson);
            assert(moduleConfig.token === userConfig.token);
            assert.deepEqual(moduleConfig.teamIds, userConfig.modules[1].teamIds);
        });

        it("should return nothing", () => {
            const userConfig: UserConfig = {};
            const pkgJson = { name: "@tegan/sara" };
            const moduleConfig = resolveModuleConfig(userConfig, pkgJson);
            assert(moduleConfig.token === undefined);
            assert(moduleConfig.teamIds === undefined);
        });

        it("should handled undefined", () => {
            const moduleConfig = resolveModuleConfig(undefined, undefined);
            assert(moduleConfig.token === undefined);
            assert(moduleConfig.teamIds === undefined);
        });

        it("should handled null", () => {
            const moduleConfig = resolveModuleConfig(null, null);
            assert(moduleConfig.token === undefined);
            assert(moduleConfig.teamIds === undefined);
        });

    });

});
