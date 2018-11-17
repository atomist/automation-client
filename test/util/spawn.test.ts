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

import * as spawn from "cross-spawn";
import * as os from "os";
import * as assert from "power-assert";
import {
    poisonAndWait,
    spawnAndWatch,
} from "../../lib/util/spawn";

/* tslint:disable:deprecation */

describe("spawn", () => {

    describe("spawnAndWatch", () => {

        it("should kill long running job", async () => {
            const script = "let t = setTimeout(function() { process.exit(11) }, 5000)";
            const cp = await spawnAndWatch({ command: "node", args: ["-e", script] }, {},
                { write: what => { return; } }, { timeout: 500 });
            assert(cp.code === null);
            assert(cp.error === true);
        });

    });

    describe("poisonAndWait", () => {

        it("should successfully wait for a child process", async () => {
            const cp = spawn("node", ["-e", "process.exit(73)"]);
            await poisonAndWait(cp, 5000);
        });

        it("should successfully kill a process that ignores SIGTERM", done => {
            const script = `process.on("SIGTERM", function(signal) { console.log("Received SIGTERM") });
let t = setTimeout(function() { process.exit(11) }, 5000);
`;
            const cp = spawn("node", ["-e", script]);
            let out = "";
            cp.stdout.on("data", chunk => out += chunk);
            // give node some time to set up the signal handler
            setTimeout(async () => {
                await poisonAndWait(cp, 200);
                assert(out === "Received SIGTERM\n");
                done();
            }, 500);
        });

        describe("tree-kill", () => {

            let originalOsPlatform: any;
            before(() => {
                originalOsPlatform = Object.getOwnPropertyDescriptor(os, "platform");
                Object.defineProperty(os, "platform", { value: () => "win32" });
            });
            after(() => {
                Object.defineProperty(os, "platform", originalOsPlatform);
            });

            it("should tree-kill", async () => {
                const cp = spawn("node", ["-e", "process.exit(0)"]);
                await poisonAndWait(cp, 5000);
            });

            it("should tree-kill all the way down", async () => {
                const script = `let cp = require("child_process");
    let n = cp.spawn("node", ["-e", "let t = setTimeout(function() { process.exit(11) }, 50000)"]);
    let t = setTimeout(function() { process.exit(11) }, 50000);
`;
                const cp = spawn("node", ["-e", script]);
                await poisonAndWait(cp, 5000);
            });

        });

    });

});
