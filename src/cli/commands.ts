import * as appRoot from "app-root-path";
import * as child_process from "child_process";
import * as fs from "fs";
import * as glob from "glob-promise";
import * as stringify from "json-stringify-safe";
import * as p from "path";
import { Arg, CommandInvocation } from "../internal/invoker/Payload";
import { logger } from "../internal/util/logger";
import { cliAtomistConfig } from "./config";
import { cliGitInfo } from "./gitInfo";

/**
 * Parse positional parameters into parameter name/value pairs.  The
 * positional parameters should be of the form NAME[=VALUE].  If
 * =VALUE is omitted, the value is set to `undefined`.  If the VALUE
 * is empty, i.e., NAME=, then the value is the empty string.
 *
 * @param args typically argv._ from tags
 * @return array of CommandInvocation Arg
 */
export function extractArgs(args: string[]): Arg[] {
    return args.map(arg => {
        const split = arg.indexOf("=");
        if (split < 0) {
            return { name: arg, value: undefined };
        }
        const name = arg.slice(0, split);
        const value = arg.slice(split + 1);
        return { name, value };
    });
}

export function readVersion(): string {
    try {
        const pj = require(`${appRoot}/package.json`);
        return `${pj.name} ${pj.version}`;
    } catch (e) {
        return "@atomist/automation-client 0.0.0";
    }
}

export function start(
    path: string,
    runInstall: boolean = true,
    runCompile: boolean = true,
): number {

    const msg = "Starting Automation Client";
    return execNode("start.client.js", "", msg, path, runInstall, runCompile);
}

export function run(
    path: string,
    ci: CommandInvocation,
    runInstall: boolean = true,
    runCompile: boolean = true,
): number {

    const args = `--request='${stringify(ci)}'`;
    const msg = `Running command '${ci.name}'`;
    return execNode("cli/run.js", args, msg, path, runInstall, runCompile);
}

export function gqlGen(
    path: string,
    pattern: string,
    runInstall: boolean = true,
): Promise<number> {

    const msg = "Running GraphQL code generator";
    let args = "--file node_modules/@atomist/automation-client/graph/schema.cortex.json " +
        "--template typescript --no-schema --out src/typings/types.d.ts";
    return glob(pattern)
        .then(graphqlFiles => {
            if (graphqlFiles.length > 0) {
                args += ` "${pattern}"`;
            }
        }, err => {
            logger.warn("GraphQL file glob pattern '${pattern}' failed, continuing");
        })
        .then(() => execNode("gql-gen", args, msg, path, runInstall, false, "node_modules/.bin"));
}

export function config(argv: any): Promise<number> {
    return cliAtomistConfig(argv);
}

export function gitInfo(argv: any): Promise<number> {
    return cliGitInfo(argv["change-dir"]);
}

function execNode(
    cmd: string,
    args: string,
    message: string,
    path: string,
    runInstall: boolean,
    runCompile: boolean,
    scriptBase: string = "node_modules/@atomist/automation-client",
): number {
    const ap = resolve(path);
    const script = `${ap}/${scriptBase}/${cmd}`;

    if (!fs.existsSync(p.join(ap, "node_modules")) && runInstall) {
        const installStatus = install(ap);
        if (installStatus !== 0) {
            return installStatus;
        }
    }

    if (!fs.existsSync(script)) {
        logger.error(`Project at '${ap}' is not a valid automation client project`);
        return 1;
    }

    if (runCompile) {
        const compileStatus = compile(ap);
        if (compileStatus !== 0) {
            return compileStatus;
        }
    }

    logger.info(`${message} in '${ap}'`);
    try {
        const nodeOptions = process.env.ATOMIST_NODE_OPTIONS || "";
        child_process.execSync(`node ${nodeOptions} \"${script}\" ${args}`,
            { cwd: ap, stdio: "inherit", env: process.env });
    } catch (e) {
        console.error(`Node command ${cmd} failed`);
        return e.status as number;
    }
    return 0;
}

export function install(path: string): number {
    logger.info(`Running 'npm install' in '${path}'`);
    try {
        if (!checkPackageJson(path)) {
            return 1;
        }
        child_process.execSync(`npm install`,
            { cwd: path, stdio: "inherit", env: process.env });
    } catch (e) {
        logger.error(`Installation failed`);
        return e.status as number;
    }
    return 0;
}

export function compile(path: string): number {
    logger.info(`Running 'npm run compile' in '${path}'`);
    try {
        if (!checkPackageJson(path)) {
            return 1;
        }
        child_process.execSync(`npm run compile`,
            { cwd: path, stdio: "inherit", env: process.env });
    } catch (e) {
        logger.error(`Compilation failed`);
        return e.status as number;
    }
    return 0;
}

export function checkPackageJson(path: string): boolean {
    const pkgPath = p.join(path, "package.json");
    if (!fs.existsSync(pkgPath)) {
        console.error(`No 'package.json' in '${path}'`);
        return false;
    }
    return true;
}

export function resolve(path: string): string {
    return p.resolve(process.cwd(), path);
}
