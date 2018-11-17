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
import * as os from "os";
import * as assert from "power-assert";
import {
    execPromise,
    spawnPromise,
} from "../../lib/util/child_process";

describe("child_promise", () => {

    describe("spawnPromise", () => {

        it("should kill long running job", async () => {
            const script = "let t = setTimeout(function() { process.exit(11) }, 5000)";
            const result = await spawnPromise("node", ["-e", script], { timeout: 500 });
            assert(result.status === null);
            assert(result.error === null);
            assert(result.signal === "SIGTERM");
        });

        it("should log output", async () => {
            const script = "console.log('foo'); console.error('bar');";
            let output: string = "";
            const log = { write: d => output += d };
            const result = await spawnPromise("node", ["-e", script], { log });
            assert(output === "foo\nbar\n");
        });

    });

    describe("execPromise", () => {

        it("should run multiple at a time", async () => {
            const cmd = "git";
            const args = ["status", "--verbose", "-u"];
            const results = await Promise.all([
                execPromise(cmd, args, { cwd: appRoot.path }),
                execPromise(cmd, args, { cwd: appRoot.path }),
                execPromise(cmd, args, { cwd: appRoot.path }),
                execPromise(cmd, args, { cwd: appRoot.path }),
            ]);
            assert(results.length === 4);
            results.forEach(r => {
                assert(/^(?:On branch|HEAD detached)/.test(r.stdout));
                assert(r.stdout === results[0].stdout);
                assert(r.stderr === results[0].stderr);
            });
        });

    });

});
