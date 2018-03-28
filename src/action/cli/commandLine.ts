import { exec } from "child-process-promise";

import { ExecOptions } from "child_process";
import { logger } from "../../internal/util/logger";
import { ActionResult } from "../ActionResult";

export interface ChildProcess {
    exitCode: number;
    killed: boolean;
    pid: number;
}

export interface CommandResult<T = undefined> extends ActionResult<T> {
    stdout: string;
    stderr: string;
    childProcess: ChildProcess;
}

/**
 * Run a child process as promise, with basic type information
 * @param {string} cmd
 * @param {"child_process".ExecOptions} opts
 * @return {Promise<CommandResult>}
 */
export function runCommand(cmd: string, opts: ExecOptions): Promise<CommandResult> {
    logger.debug((opts.cwd ? opts.cwd : "") + " ==> " + cmd);
    return exec(cmd, { capture: ["stdout", "stderr"], ...opts })
        .then(r => {
            logger.debug(r.stdout + r.stderr);
            return { ...r, success: true };
        });
}
