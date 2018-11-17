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
    ChildProcess,
    SpawnOptions,
} from "child_process";
import * as spawn from "cross-spawn";
import * as os from "os";
import * as path from "path";
import strip_ansi = require("strip-ansi");
import * as treeKill from "tree-kill";
import {
    killProcess,
    WritableLog,
} from "./child_process";
import { logger } from "./logger";

export { spawn };

/* tslint:disable:deprecation */

/**
 * Type that can react to the exit of a spawned child process, after
 * Node has terminated without reporting an error.
 * This is necessary only for commands that can return
 * a non-zero exit code on success.
 * @return whether this result should be considered an error.
 * @deprecated use @atomist/sdm version
 */
export type ErrorFinder = (code: number, signal: string, log: WritableLog) => boolean;

/**
 * Default ErrorFinder that regards return code 0 as success
 * @param {number} code
 * @return {boolean}
 * @deprecated use @atomist/sdm version
 */
export const SuccessIsReturn0ErrorFinder: ErrorFinder = code => code !== 0;

/**
 * Result returned by spawnAndWatch after running a child process.
 * @deprecated use @atomist/sdm SpawnLogResult
 */
export interface ChildProcessResult {
    /** Will be true if the ErrorFinder returns true. */
    error: boolean;
    /** Exit code of process.  It may be null or undefined if the process was killed. */
    code: number;
    /** Optional message returned by process. */
    message?: string;
    /** The Node.js child_process.ChildProcess created by spawnAndwatch. */
    childProcess: ChildProcess;
}

/**
 * spawnAndWatch specific options.
 * @deprecated use @atomist/sdm SpawnLogOptions
 */
export interface SpawnWatchOptions {
    /**
     * If your command can return zero on failure or non-zero on
     * success, you can override the default behavior of determining
     * success or failure using this option.  For example, if your
     * command returns zero for certain types of errors, you can scan
     * the log content from the command to determine if an error
     * occurs.
     */
    errorFinder: ErrorFinder;
    /**
     * Set to true if ANSI escape codes should be stripped from the
     * output before sending it to the log.
     */
    stripAnsi: boolean;
    /**
     * Amount of time in milliseconds to wait for process to exit.  If
     * it does not exit in the allotted time, it is kill
     */
    timeout: number;
    /**
     * Set to true if you want the command line sent to the
     * Writablelog provided to spawnAndWatch.
     */
    logCommand: boolean;
}

/**
 * Spawn a process, log its output, and wait for it to exit,
 * asynchronously.  It is spawned using cross-spawn.
 *
 * @param {SpawnCommand} spawnCommand command to run
 * @param options standard spawn options
 * @param log log to write output to
 * @param {Partial<SpawnWatchOptions>} spOpts
 * @return {Promise<ChildProcessResult>}
 * @deprecated use @atomist/sdm spawnAndLog
 */
export async function spawnAndWatch(spawnCommand: SpawnCommand,
                                    options: SpawnOptions,
                                    log: WritableLog,
                                    spOpts: Partial<SpawnWatchOptions> = {}): Promise<ChildProcessResult> {
    const childProcess = spawn(spawnCommand.command, spawnCommand.args || [], options);
    if (spOpts.logCommand === false) {
        logger.debug(`${options.cwd || path.resolve(".")} > ${stringifySpawnCommand(spawnCommand)} (pid '${childProcess.pid}')`);
    } else {
        log.write(`/--\n`);
        log.write(`${options.cwd || path.resolve(".")} > ${stringifySpawnCommand(spawnCommand)} (pid '${childProcess.pid}')\n`);
        log.write(`\\--\n`);
    }
    return watchSpawned(childProcess, log, spOpts);
}

/**
 * Handle the result of a spawned process, streaming back
 * output to log
 * @param childProcess
 * @param log to write stdout and stderr to
 * @param opts: Options for error parsing, ANSI code stripping etc.
 * @return {Promise<ChildProcessResult>}
 * @deprecated use @atomist/sdm spawnAndLog
 */
async function watchSpawned(childProcess: ChildProcess,
                            log: WritableLog,
                            opts: Partial<SpawnWatchOptions> = {}): Promise<ChildProcessResult> {
    let timer: NodeJS.Timer;
    let running = true;
    if (opts.timeout) {
        timer = setTimeout(() => {
            if (running) {
                logger.warn("Spawn timeout expired. Killing command with pid '%s'", childProcess.pid);
                killProcess(childProcess.pid);
            }
        }, opts.timeout);
    }

    return new Promise<ChildProcessResult>((resolve, reject) => {
        const optsToUse = {
            errorFinder: SuccessIsReturn0ErrorFinder,
            stripAnsi: false,
            ...opts,
        };
        if (!optsToUse.errorFinder) {
            // The caller specified undefined, which is an error. Ignore them, for they know not what they do.
            optsToUse.errorFinder = SuccessIsReturn0ErrorFinder;
        }

        function sendToLog(data) {
            const formatted = optsToUse.stripAnsi ? strip_ansi(data.toString()) : data.toString();
            return log.write(formatted);
        }

        childProcess.stdout.on("data", sendToLog);
        childProcess.stderr.on("data", sendToLog);
        childProcess.addListener("exit", (code, signal) => {
            running = false;
            logger.info("Spawn exit with pid '%d': code '%d', signal '%d'", childProcess.pid, code, signal);
            clearTimeout(timer);
            resolve({
                error: optsToUse.errorFinder(code, signal, log),
                code,
                childProcess,
            });
        });
        childProcess.addListener("error", err => {
            running = false;
            // Process could not be spawned or killed
            logger.warn("Spawn failure: %s", err);
            clearTimeout(timer);
            reject(err);
        });
    });
}

/**
 * The first two arguments to Node spawn
 * @deprecated not used by @atomist/sdm spawnAndLog
 */
export interface SpawnCommand {

    command: string;
    args?: string[];
    options?: any;
}

/**
 * toString for a SpawnCommand. Used for logging.
 * @param {SpawnCommand} sc
 * @return {string}
 * @deprecated use childProcessString
 */
export function stringifySpawnCommand(sc: SpawnCommand): string {
    return `${sc.command}${(!!sc.args) ? " '" + sc.args.join("' '") + "'" : ""}`;
}

/**
 * Convenience function to create a spawn command from a sentence such
 * as "npm run compile" Does not respect quoted arguments.  Use
 * spawnAndWatch passing it the command and argument array if your
 * command arguments have spaces, etc.
 *
 * @param {string} sentence command and argument string
 * @param options
 * @return {SpawnCommand}
 * @deprecated just pass the proper arguments to @atomist/sdm spawnAndLog
 */
export function asSpawnCommand(sentence: string, options: SpawnOptions = {}): SpawnCommand {
    const split = sentence.split(" ");
    return {
        command: split[0],
        args: split.slice(1),
        options,
    };
}

/**
 * Kill the child process and wait for it to shut down. This can take
 * a while as child processes may have shut down hooks.  On win32,
 * tree-kill is used and the Promise is rejected if the process(es) do(es)
 * not exit within `wait` milliseconds.  On other platforms, first the
 * child process is sent the default signal, SIGTERM.  After `wait`
 * milliseconds, it is sent SIGKILL.  After another `wait`
 * milliseconds, an error is thrown.
 *
 * @param {module:child_process.ChildProcess} childProcess
 * @param wait the number of milliseconds to wait before sending SIGKILL and
 *             then erroring, default is 30000 ms
 * @return {Promise<any>}
 * @deprecated use @atomist/sdm killAndWait
 */
export async function poisonAndWait(childProcess: ChildProcess, wait: number = 30000): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        const pid = childProcess.pid;
        const termTimer = setTimeout(() => {
            if (os.platform() === "win32") {
                reject(new Error(`Failed to tree-kill child process ${pid} in ${wait} ms`));
            } else {
                logger.debug(`Child process ${pid} did not exit in ${wait} ms, sending SIGKILL`);
                childProcess.kill("SIGKILL");
            }
        }, wait);
        const killTimer = (os.platform() === "win32") ? undefined : setTimeout(() => {
            reject(new Error(`Failed to kill child process ${pid}`));
        }, 2 * wait);
        childProcess.on("close", clearAndResolve(pid, resolve, termTimer, killTimer));
        childProcess.on("exit", (code, signal) => {
            logger.debug(`Child process ${pid} exited with code '${code}' and signal '${signal}'`);
        });
        childProcess.on("error", clearAndReject(pid, reject, termTimer, killTimer));
        killProcess(pid);
    });
}

/**
 * Cross-platform kill.  On win32, tree-kill is used and signal is
 * ignored since win32 does not support different signals.  On other
 * platforms, ChildProcess.kill(signal) is used.
 *
 * @param cp child process to kill
 * @param signal optional signal, Node.js default is used if not provided
 * @deprecated use killProcess
 */
export function crossKill(cp: ChildProcess, signal?: string): void {
    if (os.platform() === "win32") {
        logger.debug(`Calling tree-kill on child process ${cp.pid}`);
        treeKill(cp.pid);
    } else {
        const sig = (signal) ? `signal ${signal}` : "default signal";
        logger.debug(`Sending ${sig} to child process ${cp.pid}`);
        cp.kill(signal);
    }
}

/**
 * Clear provided timers and resolve a promise.
 * @deprecated not used by spawnPromise
 */
function clearAndResolve(pid: number, resolve: () => void, ...timers: NodeJS.Timer[]): (code: number, signal: string) => void {
    return (code: number, signal: string) => {
        logger.debug(`Child process ${pid} closed with code '${code}' and signal '${signal}'`);
        clearTimers(timers);
        resolve();
    };
}

/**
 * Clear provided timers and reject a promise.
 * @deprecated not used by spawnPromise
 */
function clearAndReject(pid: number, reject: (e: Error) => void, ...timers: NodeJS.Timer[]): (reason: Error) => void {
    return (reason: Error) => {
        logger.error(`Child process ${pid} errored: ${reason.message}`);
        clearTimers(timers);
        reject(reason);
    };
}

/**
 * Clear provided timers.  It checks to make sure the timers are
 * defined before clearing them.
 *
 * @param timers the timers to clear.
 * @deprecated only used by deprecated functions
 */
function clearTimers(timers: NodeJS.Timer[]): void {
    timers.filter(t => !!t).map(t => clearTimeout(t));
}
