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
import * as assert from "power-assert";
import { sleep } from "../../lib/internal/util/poll";
import {
    execPromise,
    killProcess,
    spawn,
    spawnPromise,
} from "../../lib/util/child_process";

describe("child_promise", () => {

    describe("killProcess", () => {

        it("should kill a process with the default signal", done => {
            const script = "let t = setTimeout(function() { process.exit(5) }, 5000)";
            const cp = spawn("node", ["-e", script]);
            let exited = false;
            cp.on("exit", (c, s) => {
                exited = true;
            });
            cp.on("close", (c, s) => {
                assert(exited);
                assert(c === null);
                assert(s === "SIGTERM");
                done();
            });
            cp.on("error", e => {
                done(new Error(`child process ${cp.pid} errored: ${e.message}`));
            });
            killProcess(cp.pid);
        });

        it("should kill a process with provided signal", done => {
            const script = "let t = setTimeout(function() { process.exit(6) }, 6000)";
            const cp = spawn("node", ["-e", script]);
            let exited = false;
            cp.on("exit", (c, s) => {
                exited = true;
            });
            const signal = "SIGINT";
            cp.on("close", (c, s) => {
                assert(exited);
                assert(c === null);
                assert(s === signal);
                done();
            });
            cp.on("error", e => {
                done(new Error(`child process ${cp.pid} errored: ${e.message}`));
            });
            killProcess(cp.pid, signal);
        });

        it("should not kill if signal handled", async () => {
            // delay to allow the spawned node process to start and set up signal handler
            const delay = 100;
            const script = "process.on('SIGTERM', function() { return; }); let t = setTimeout(function() { process.exit(7) }, 7000)";
            let running = true;
            let code: number;
            let signal: string;
            const cp = spawn("node", ["-e", script]);
            cp.on("exit", (c, s) => {
                running = false;
            });
            cp.on("close", (c, s) => {
                running = false;
                code = c;
                signal = s;
            });
            cp.on("error", e => {
                assert.fail(`child process ${cp.pid} errored: ${e.message}`);
            });
            await sleep(delay);
            killProcess(cp.pid, "SIGTERM");
            await sleep(2 * delay);
            assert(running, "child process should not have been killed by SIGTERM");
            killProcess(cp.pid, "SIGINT");
            await sleep(2 * delay);
            assert(!running, "child process should have been killed by SIGINT");
            assert(code === null);
            assert(signal === "SIGINT");
        });

    });

    describe("spawnPromise", () => {

        it("should run a command successfully", async () => {
            const script = "process.exit(0);";
            const result = await spawnPromise("node", ["-e", script]);
            assert(result.status === 0);
            assert(result.error === null);
            assert(result.signal === null);
            assert(result.stdout === "");
            assert(result.stderr === "");
        });

        it("should know a command exits with non-zero status", async () => {
            const script = "process.exit(13);";
            const result = await spawnPromise("node", ["-e", script]);
            assert(result.status === 13);
            assert(result.error === null);
            assert(result.signal === null);
            assert(result.stdout === "");
            assert(result.stderr === "");
        });

        it("should differentiate stdout and stderr", async () => {
            const script = "console.log('foo'); console.error('bar');";
            const result = await spawnPromise("node", ["-e", script]);
            assert(result.status === 0);
            assert(result.error === null);
            assert(result.signal === null);
            assert(result.stdout === "foo\n");
            assert(result.stderr === "bar\n");
        });

        it("should return an error if invalid command", async () => {
            const result = await spawnPromise("sdlfkjasdflkjasdweijvasfskdjf");
            assert(result.status === null);
            assert(result.signal === null);
            assert(result.stdout === "");
            assert(result.stderr === "");
            assert(result.error);
            assert(result.error.message.startsWith("Failed to run command: "));
        });

        it("should kill long running job", async () => {
            const script = "let t = setTimeout(function() { process.exit(11) }, 5000)";
            const result = await spawnPromise("node", ["-e", script], { timeout: 500 });
            assert(result.status === null);
            assert(result.error === null);
            assert(result.signal === "SIGTERM");
            assert(result.stdout === "");
            assert(result.stderr === "");
        });

        it("should log output", async () => {
            const script = "console.log('foo'); console.error('bar');";
            let output: string = "";
            const log = { write: d => output += d };
            const result = await spawnPromise("node", ["-e", script], { log, logCommand: false });
            assert(output === "foo\nbar\n");
            assert(result.status === 0);
            assert(result.error === null);
            assert(result.signal === null);
            assert(result.stdout === "See log\n");
            assert(result.stderr === "See log\n");
        });

        it("should log command", async () => {
            const script = "process.exit(0);";
            let output: string = "";
            const log = { write: d => output += d };
            const opts = {
                cwd: appRoot.path,
                log,
                logCommand: true,
            };
            const result = await spawnPromise("node", ["-e", script], opts);
            assert(output === `Spawned: ${result.cmdString} (PID ${result.pid})\n` +
                `Child process close with code 0 and signal null: ${result.cmdString}\n`);
        });

    });

    describe("execPromise", () => {

        it("should capture stdout", async () => {
            const script = "console.log('foo'); console.log('bar');";
            const result = await execPromise("node", ["-e", script]);
            assert(result.stdout === "foo\nbar\n");
            assert(result.stderr === "");
        });

        it("should capture stderr", async () => {
            const script = "console.error('foo'); console.error('bar');";
            const result = await execPromise("node", ["-e", script]);
            assert(result.stdout === "");
            assert(result.stderr === "foo\nbar\n");
        });

        it("should differentiate stdout and stderr", async () => {
            const script = "console.log('foo'); console.error('bar');";
            const result = await execPromise("node", ["-e", script]);
            assert(result.stdout === "foo\n");
            assert(result.stderr === "bar\n");
        });

        it("should throw an error if process returns non-zero", async () => {
            const script = "process.exit(17);";
            try {
                await execPromise("node", ["-e", script]);
                assert.fail("should have thrown an exception");
            } catch (e) {
                assert(/^Child process \d+ exited with non-zero status 17: /.test(e.message));
                assert(e.status === 17);
            }
        });

        it("should throw an error if process is killed by a signal", async () => {
            const script = "let t = setTimeout(function() { process.exit(0) }, 5000); process.kill(process.pid, 'SIGKILL');";
            try {
                await execPromise("node", ["-e", script]);
                assert.fail("should have thrown an exception");
            } catch (e) {
                assert(/^Child process \d+ received signal SIGKILL: /.test(e.message));
                assert(e.signal === "SIGKILL");
            }
        });

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
