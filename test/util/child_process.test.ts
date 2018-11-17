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
            const cmd = "node";
            const script = `const t = setTimeout(function() { process.exit(0) }, 500);
console.error("Breakin' 2");
console.log('Electric Boogaloo');
`;
            const args = ["-e", script];
            const results = await Promise.all([
                execPromise(cmd, args),
                execPromise(cmd, args),
                execPromise(cmd, args),
                execPromise(cmd, args),
                execPromise(cmd, args),
                execPromise(cmd, args),
                execPromise(cmd, args),
                execPromise(cmd, args),
            ]);
            assert(results.length === 8);
            results.forEach(r => {
                assert(r.stdout === "Electric Boogaloo\n");
                assert(r.stderr === "Breakin' 2\n");
            });
        });

    });

});
