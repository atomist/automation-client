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

import * as assert from "power-assert";

import * as appRoot from "app-root-path";

import {
    execIn,
} from "../../lib/util/exec";

describe("exec", () => {

    describe("execIn", () => {

        it("should run multiple at a time", async () => {
            const cmd = "git";
            const args = ["status", "--verbose", "-u"];
            const results = await Promise.all([
                execIn(appRoot.path, cmd, args),
                execIn(appRoot.path, cmd, args),
                execIn(appRoot.path, cmd, args),
                execIn(appRoot.path, cmd, args),
            ]);
            assert(results.length === 4);
            results.forEach(r => {
                assert(r.stdout.startsWith("On branch "));
                assert(r.stdout === results[0].stdout);
                assert(r.stderr === results[0].stderr);
            });
        });

    });

});
