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
    SpawnSyncOptions,
    SpawnSyncReturns,
} from "child_process";
import * as spawn from "cross-spawn";
import * as process from "process";
import stripAnsi from "strip-ansi";
import * as treeKill from "tree-kill";
import {
    LeveledLogMethod,
    logger,
} from "./logger";

export { spawn };

/**
 * Convert child process into an informative string.
 *
 * @param cmd Command being run.
 * @param args Arguments to command.
 * @param opts Standard child_process.SpawnOptions.
 */
export function childProcessString(cmd: string, args: string[] = [], opts: SpawnOptions = {}): string {
    return (opts.cwd ? opts.cwd : process.cwd()) + " ==> " + cmd +
        (args.length > 0 ? " '" + args.join("' '") + "'" : "");
}

/**
 * Cross-platform kill a process and all its children using tree-kill.
 * On win32, signal is ignored since win32 does not support different
 * signals.
 *
 * @param pid ID of process to kill.
 * @param signal optional signal name or number, Node.js default is used if not provided
 */
export function killProcess(pid: number, signal?: string | number): void {
    const sig = (signal) ? `signal ${signal}` : "default signal";
    logger.debug(`Calling tree-kill on child process ${pid} with ${sig}`);
    treeKill(pid, signal);
}

/**
 * Interface for a writable log that provides a function to write to
 * the log.
 */
export interface WritableLog {
    /**
     * The content already written to the log.  This is optional as
     * some implementations may choose to not expose their log as a
     * string as it could be too long.
     */
    log?: string;
    /**
     * Set to true if ANSI escape characters should be stripped from
     * the data before writing to log.
     */
    stripAnsi?: boolean;

    /** Function that appends to the log. */
    write(what: string): void;
}

/**
 * Add logging to standard SpawnSyncoptions.  If no `encoding` is
 * provided, it is set to "buffer" if `log` is defined and "utf8"
 * otherwise.
 */
export interface SpawnPromiseOptions extends SpawnSyncOptions {
    /**
     * Optional logger to write stdout and stderr to.  If this is
     * provided, the encoding for it is taken from the `encoding`
     * option property and that property is set to "bufffer".  If no
     * `encoding` is defined, the default encoding for the log is
     * "utf8".
     */
    log?: WritableLog;
    /**
     * Set to true if you want the command line sent to the
     * Writablelog provided to spawnPromise.  Set to false if the
     * command or its arguments contain sensitive information.
     */
    logCommand?: boolean;
}

/**
 * Safely clear a timer that may be undefined.
 *
 * @param timer A timer that may not be set.
 */
function clearTimer(timer: NodeJS.Timer | undefined): undefined {
    if (timer) {
        clearTimeout(timer);
    }
    return undefined;
}

export interface SpawnPromiseReturns extends SpawnSyncReturns<string> {
    /** Stringified command. */
    cmdString: string;
}

/**
 * Call cross-spawn and return a Promise of its result.  The result
 * has the same shape as the object returned by
 * `child_process.spawnSync()`, which means errors are not thrown but
 * returned in the `error` property of the returned object.  If your
 * command will produce lots of output, provide a log to write it to.
 *
 * @param cmd Command to run.  If it is just an executable name, paths
 *            with be searched, batch and command files will be checked,
 *            etc.  See cross-spawn documentation for details.
 * @param args Arguments to command.
 * @param opts Standard child_process.SpawnOptions plus a few specific
 *             to this implementation.
 * @return a Promise that provides information on the child process and
 *         its execution result.  If an error occurs, the `error` property
 *         of [[SpawnPromiseReturns]] will be populated.
 */
export async function spawnPromise(cmd: string, args: string[] = [], opts: SpawnPromiseOptions = {}): Promise<SpawnPromiseReturns> {
    return new Promise<SpawnPromiseReturns>((resolve, reject) => {
        const optsToUse: SpawnPromiseOptions = {
            logCommand: true,
            ...opts,
        };
        const cmdString = childProcessString(cmd, args, optsToUse);
        let logEncoding = "utf8";
        if (!optsToUse.encoding) {
            if (optsToUse.log) {
                optsToUse.encoding = "buffer";
            } else {
                optsToUse.encoding = "utf8";
            }
        } else if (optsToUse.log && optsToUse.encoding !== "buffer") {
            logEncoding = optsToUse.encoding;
            optsToUse.encoding = "buffer";
        }

        function pLog(data: string): void {
            const formatted = (optsToUse.log && optsToUse.log.stripAnsi) ? stripAnsi(data) : data;
            optsToUse.log.write(formatted);
        }

        function commandLog(data: string, l: LeveledLogMethod = logger.debug): void {
            if (optsToUse.log && optsToUse.logCommand) {
                const terminated = (data.endsWith("\n")) ? data : data + "\n";
                pLog(terminated);
            } else {
                l(data);
            }
        }

        logger.debug(`Spawning: ${cmdString}`);
        const childProcess = spawn(cmd, args, optsToUse);
        commandLog(`Spawned: ${cmdString} (PID ${childProcess.pid})`);

        let timer: NodeJS.Timer;
        if (optsToUse.timeout) {
            timer = setTimeout(() => {
                commandLog(`Child process timeout expired, killing command: ${cmdString}`, logger.warn);
                killProcess(childProcess.pid, optsToUse.killSignal);
            }, optsToUse.timeout);
        }
        let stderr: string = "";
        let stdout: string = "";
        if (optsToUse.log) {
            function logData(data: Buffer): void {
                pLog(data.toString(logEncoding));
            }
            childProcess.stderr.on("data", logData);
            childProcess.stdout.on("data", logData);
            stderr = stdout = "See log\n";
        } else {
            childProcess.stderr.on("data", (data: string) => stderr += data);
            childProcess.stdout.on("data", (data: string) => stdout += data);
        }
        childProcess.on("exit", (code, signal) => {
            timer = clearTimer(timer);
            logger.debug(`Child process exit with code ${code} and signal ${signal}: ${cmdString}`);
        });
        /* tslint:disable:no-null-keyword */
        childProcess.on("close", (code, signal) => {
            timer = clearTimer(timer);
            commandLog(`Child process close with code ${code} and signal ${signal}: ${cmdString}`);
            resolve({
                cmdString,
                pid: childProcess.pid,
                output: [null, stdout, stderr],
                stdout,
                stderr,
                status: code,
                signal,
                error: null,
            });
        });
        childProcess.on("error", err => {
            timer = clearTimer(timer);
            err.message = `Failed to run command: ${cmdString}: ${err.message}`;
            commandLog(err.message, logger.error);
            resolve({
                cmdString,
                pid: childProcess.pid,
                output: [null, stdout, stderr],
                stdout,
                stderr,
                status: null,
                signal: null,
                error: err,
            });
        });
        /* tslint:enable:no-null-keyword */
    });
}

/**
 * Standard output and standard error from executing a child process.
 * No code or signal is provided because if you receive this value,
 * the child process completed successfully, i.e., exited normally
 * with a status of 0.
 */
export interface ExecPromiseResult {
    /** Child process standard output. */
    stdout: string;
    /** Child process standard error. */
    stderr: string;
}

/**
 * Error thrown when a command cannot be executed, the command is
 * killed by a signal, or returns a non-zero exit status.
 */
export class ExecPromiseError extends Error implements ExecPromiseResult {
    /** Create an ExecError from a SpawnSyncReturns<string> */
    public static fromSpawnReturns(r: SpawnSyncReturns<string>): ExecPromiseError {
        return new ExecPromiseError(r.error.message, r.pid, r.output, r.stdout, r.stderr, r.status, r.signal);
    }

    constructor(
        /** Message describing reason for failure. */
        public message: string,
        /** Command PID. */
        public pid: number,
        /** stdio */
        public output: string[],
        /** Child process standard output. */
        public stdout: string,
        /** Child process standard error. */
        public stderr: string,
        /** Child process exit status. */
        public status: number,
        /** Signal that killed the process, if any. */
        public signal: string,
    ) {
        super(message);
        Object.setPrototypeOf(this, new.target.prototype);
    }
}

/**
 * Run a child process using cross-spawn, capturing and returning
 * stdout and stderr, like exec, in a promise.  If an error occurs,
 * the process is killed by a signal, or the process exits with a
 * non-zero status, the Promise is rejected.  Any provided `stdio`
 * option is ignored, being overwritten with `["pipe","pipe","pipe"]`.
 * Like with child_process.exec, this is not a good choice if the
 * command produces a large amount of data on stdout or stderr.
 *
 * @param cmd name of command, can be a shell script or MS Windows
 *            .bat or .cmd
 * @param args command arguments
 * @param opts standard child_process.SpawnOptions
 * @return Promise resolving to exec-like callback arguments having
 *         stdout and stderr properties.  If an error occurs, exits
 *         with a non-zero status, and killed with a signal, the
 *         Promise is rejected with an [[ExecPromiseError]].
 */
export async function execPromise(cmd: string, args: string[] = [], opts: SpawnSyncOptions = {}): Promise<ExecPromiseResult> {
    opts.stdio = ["pipe", "pipe", "pipe"];
    if (!opts.encoding) {
        opts.encoding = "utf8";
    }
    const result = await spawnPromise(cmd, args, opts);
    if (result.error) {
        throw ExecPromiseError.fromSpawnReturns(result);
    }
    if (result.status) {
        const msg = `Child process ${result.pid} exited with non-zero status ${result.status}: ${result.cmdString}\n${result.stderr}`;
        logger.error(msg);
        result.error = new Error(msg);
        throw ExecPromiseError.fromSpawnReturns(result);
    }
    if (result.signal) {
        const msg = `Child process ${result.pid} received signal ${result.signal}: ${result.cmdString}\n${result.stderr}`;
        logger.error(msg);
        result.error = new Error(msg);
        throw ExecPromiseError.fromSpawnReturns(result);
    }
    return { stdout: result.stdout, stderr: result.stderr };
}
