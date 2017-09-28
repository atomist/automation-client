
import { exec } from "child-process-promise";

import { ExecOptions} from "child_process";
import { logger } from "./logger";

export interface ChildProcess {
    exitCode: number;
    killed: boolean;
    pid: number;
}

export interface CommandResult {
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
    return exec(cmd, opts);
}
