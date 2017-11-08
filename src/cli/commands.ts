import * as child_process from "child_process";
import * as fs from "fs";
import * as p from "path";
import { CommandInvocation } from "../internal/invoker/Payload";
import { logger } from "../internal/util/logger";

export function start(path: string,
                      runInstall: boolean = true,
                      runCompile: boolean = true) {
    const ap = resolve(path);
    path = `${ap}/node_modules/@atomist/automation-client/start.client.js`;

    if (!fs.existsSync(p.join(ap, "node_modules")) && runInstall) {
        install(ap);
    }

    if (!fs.existsSync(path)) {
        logger.error(`Project at '${ap}' is not a valid automation client project`);
        process.exit(1);
    }

    if (runCompile) {
        compile(ap);
    }

    logger.info(`Starting Automation Client in '${ap}'\n`);
    try {
        child_process.execSync(`node ${path}`,
            { cwd: ap, stdio: "inherit", env: process.env });
    } catch (e) {
        process.exit(e.status);
    }
}

export function run(path: string,
                    ci: CommandInvocation,
                    runInstall: boolean = true,
                    runCompile: boolean = true) {
    const ap = resolve(path);
    path = `${ap}/node_modules/@atomist/automation-client/cli/run.js`;

    if (!fs.existsSync(p.join(ap, "node_modules")) && runInstall) {
        install(ap);
    }

    if (!fs.existsSync(path)) {
        logger.error(`Project at '${ap}' is not a valid automation client project`);
        process.exit(1);
    }

    if (runCompile) {
        compile(ap);
    }

    logger.info(`Running command '${ci.name}' in '${ap}'\n`);
    try {
        child_process.execSync(`node ${path} --request='${JSON.stringify(ci)}'`,
            { cwd: ap, stdio: "inherit", env: process.env });
    } catch (e) {
        process.exit(e.status);
    }
}

export function config() {
    const script = p.resolve(__dirname, "config.js");
    child_process.execSync(`node ${script}`,
        { cwd: process.cwd(), stdio: "inherit", env: process.env });
}

export function gitInfo(path: string) {
    const script = p.resolve(__dirname, "git-info.js");
    child_process.execSync(`node ${script}`,
        { cwd: process.cwd(), stdio: "inherit", env: process.env });
}

export function install(path: string) {
    logger.info(`Running 'npm install' in '${path}'`);
    try {
        child_process.execSync(`npm install`,
            {cwd: path, stdio: "inherit", env: process.env});
    } catch (e) {
        process.exit(e.status);
    }
}

export function compile(path: string) {
    logger.info(`Running 'npm run compile' in '${path}'`);
    try {
        child_process.execSync(`npm run compile`,
            {cwd: path, stdio: "inherit", env: process.env});
    } catch (e) {
        process.exit(e.status);
    }
}

export function resolve(path: string): string {
    return p.resolve(process.cwd(), path);
}
