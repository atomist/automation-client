/*
 * Copyright © 2017 Atomist
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

import "mocha";
import * as assert from "power-assert";

import { resolveModuleConfig, UserConfig } from "../src/configuration";
import { LoggingConfig } from "../src/internal/util/logger";

LoggingConfig.format = "cli";

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
