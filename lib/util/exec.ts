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

import {
    SpawnOptions,
} from "child_process";
import * as spawn from "cross-spawn";
import * as process from "process";

import { logger } from "./logger";

/**
 * Standard output and standard error.
 */
export interface ExecResult {
    stdout: string;
    stderr: string;
}

/**
 * Error thrown when a command cannot be executed, the command is
 * killed, or returns a non-zero exit status.
 */
export class ExecError extends Error {
    constructor(
        public message: string,
        public cmd: string,
        public code: number,
        public signal: string,
        public stdout: string,
        public stderr: string,
    ) {
        super(message);
        Object.setPrototypeOf(this, new.target.prototype);
    }
}

/**
 * Run a child process using cross-spawn, capturing and returning
 * stdout and stderr, like exec, in a promise.  If an error occurs,
 * the process is killed by a signal, or the process exits with a
 * non-zero status, the Promise is rejected.  stdin is inherited from
 * the parent process.  Like with child_process.exec, this is not a
 * good choice if the command produces a large amount of data on
 * stdout or stderr.
 *
 * @param {string} cmd name of command, can be a shell script or MS Windows .bat or .cmd
 * @param {string[]} args command arguments
 * @param {"child_process".SpawnOptions} opts standard spawn options
 * @return {Promise<ExecResult>} exec-like callback arguments having stdout and stderr properties
 */
export async function safeExec(cmd: string, args: string[] = [], opts: SpawnOptions = {}): Promise<ExecResult> {
    const cmdString = (opts.cwd ? opts.cwd : process.cwd) + " ==> " + cmd +
        (args.length > 0 ? " '" + args.join("' '") + "'" : "");
    logger.debug(`Running: ${cmdString}`);
    opts.stdio = ["pipe", "pipe", "pipe"];
    const childProcess = spawn(cmd, args, opts);
    return new Promise<ExecResult>((resolve, reject) => {
        let stdout = "";
        let stderr = "";
        childProcess.stdout.on("data", data => {
            stdout += data.toString();
        });
        childProcess.stderr.on("data", data => {
            stderr += data.toString();
        });
        childProcess.on("close", (code, signal) => {
            logger.debug(`Child process exited with code ${code} and signal ${signal}: ${cmdString}`);
            if (code) {
                const msg = `Child process ${process.pid} exited with non-zero status ${code}: ${cmdString}\n${stderr}`;
                reject(new ExecError(msg, cmdString, code, signal, stdout, stderr));
                return;
            }
            if (signal) {
                const msg = `Child process ${process.pid} received signal ${signal}: ${cmdString}\n${stderr}`;
                reject(new ExecError(msg, cmdString, code, signal, stdout, stderr));
                return;
            }
            resolve({ stdout, stderr });
        });
        childProcess.on("error", err => {
            logger.error(`Failed to run command: ${cmdString}: ${err.message}`);
            reject({ ...err, cmd: cmdString, stdout, stderr });
        });
    });
}

/**
 * Safely exec a command in a specific directory.
 *
 * @param baseDir directory to run command in
 * @param cmd command to run
 * @param args command arguments
 * @return Promise of { stdout, stderr }
 */
export async function execIn(baseDir: string, cmd: string, args: string[]): Promise<ExecResult> {
    return safeExec(cmd, args, { cwd: baseDir });
}
