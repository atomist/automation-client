#!/usr/bin/env node

import { LoggingConfig } from "./internal/util/logger";
process.env.SUPPRESS_NO_CONFIG_WARNING = "true";
LoggingConfig.format = "cli";

import * as yargs from "yargs";
import {
    config,
    gitInfo,
    run,
    start,
} from "./cli/commands";
import {
    CommandInvocation,
} from "./internal/invoker/Payload";

// tslint:disable-next-line:no-unused-expression
yargs.completion("completion")
    .command(["command <name>", "cmd <name>"], "Run a command", ya => {
        // positional is not yet supported in @types/yargs
        return (ya as any).positional("name", {
            describe: "Name of command to run",
            required: true,
        })
        .option("path", {
            alias: "p",
            describe: "Path to automation client project",
            required: false,
            default: process.cwd(),
        });
    }, argv => {
        const args = extractArgs(argv);
        const ci: CommandInvocation = {
            name: argv.name,
            args,
        };
        run(argv.path, ci);
    })
    .command(["start", "st", "run"], "Start an automation client", ya => {
        return ya.option("path", {
            alias: "p",
            describe: "Path to automation client project",
            required: false,
            default: process.cwd(),
        });
    }, argv => {
        start(argv.path);
    })
    .command("git", "Create a git-info.json file", ya => {
        return ya.option("path", {
            alias: "p",
            describe: "Path to automation client project",
            required: false,
            default: process.cwd(),
        });
    }, argv => {
        gitInfo(argv.path);
    })
    .command("config", "Configure environment for running automation clients", ya => {
        return ya;
    }, argv => {
        config();
    })
    .showHelpOnFail(false, "Specify --help for available options")
    .alias("h", "help")
    .alias("?", "help")
    .version(readVersion())
    .alias("v", "version")
    .describe("version", "Show version information")
    .argv;

function extractArgs(args) {
    return Object.getOwnPropertyNames(args)
        // .filter(k => !(k.includes("$") || k.includes("_")))
        .map(k => {
            return {name: k, value: args[k]};
        });
}

function readVersion(): string {
    try {
        const pj = require("../package.json");
        return `${pj.name} ${pj.version}`;
    } catch (e) {
        return "@atomist/automation-client 0.0.0";
    }
}
