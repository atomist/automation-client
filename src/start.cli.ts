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
    .command(["execute <name>", "exec <name>", "cmd <name>"], "Run a command", ya => {
        // positional is not yet supported in @types/yargs
        return (ya as any).positional("name", {
            describe: "Name of command to run",
            required: true,
        })
        .option("change-dir", {
            alias: "C",
            describe: "Path to automation client project",
            required: false,
            default: process.cwd(),
        })
        .boolean("compile")
        .default("compile", true )
        .describe("compile", "Run 'npm run compile'")
        .boolean("install")
        .default("install", true)
        .describe("install", "Run 'npm install'");
    }, argv => {
        const args = extractArgs(argv);
        const ci: CommandInvocation = {
            name: argv.name,
            args,
        };
        try {
            run(argv["change-dir"], ci, argv.install, argv.compile);
        } catch (e) {
            console.log("Error: %s", e.message);
            process.exit(1);
        }
    })
    .command(["start", "st", "run"], "Start an automation client", ya => {
        return ya.option("change-dir", {
            alias: "C",
            describe: "Path to automation client project",
            required: false,
            default: process.cwd(),
        })
        .boolean("compile")
        .default("compile", true )
        .describe("compile", "Run 'npm run compile'")
        .boolean("install")
        .default("install", true)
        .describe("install", "Run 'npm install'");
    }, argv => {
        try {
            start(argv["change-dir"], argv.install, argv.compile);
        } catch (e) {
            console.log("Error: %s", e.message);
            process.exit(1);
        }

    })
    .command("git", "Create a git-info.json file", ya => {
        return ya.option("change-dir", {
            alias: "C",
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
