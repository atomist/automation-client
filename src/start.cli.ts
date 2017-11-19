#!/usr/bin/env node
// unified Atomist CLI

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

const Package = "atomist";

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
                default: process.cwd(),
            })
            .boolean("compile")
            .default("compile", true)
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
            console.error(`${Package}: Error: ${e.message}`);
            process.exit(1);
        }
    })
    .command(["start", "st", "run"], "Start an automation client", ya => {
        return ya.option("change-dir", {
            alias: "C",
            describe: "Path to automation client project",
            default: process.cwd(),
        })
            .boolean("compile")
            .default("compile", true)
            .describe("compile", "Run 'npm run compile' before starting")
            .boolean("install")
            .default("install", true)
            .describe("install", "Run 'npm install' before starting/compiling");
    }, argv => {
        try {
            start(argv["change-dir"], argv.install, argv.compile);
        } catch (e) {
            console.error(`${Package}: Error: ${e.message}`);
            process.exit(1);
        }

    })
    .command("git", "Create a git-info.json file", ya => {
        return ya
            .option("change-dir", {
                alias: "C",
                describe: "Path to automation client project",
                default: process.cwd(),
            });
    }, argv => {
        gitInfo(argv)
            .then(status => process.exit(status), err => {
                console.error(`${Package}: Unhandled Error: ${err.message}`);
                process.exit(101);
            });
    })
    .command("config", "Configure environment for running automation clients", ya => {
        return ya
            .option("slack-team", {
                describe: "Slack team ID",
                requiresArg: true,
                type: "string",
            })
            .option("github-user", {
                describe: "GitHub user login",
                requiresArg: true,
                type: "string",
            })
            .option("github-password", {
                describe: "GitHub user password",
                requiresArg: true,
                type: "string",
            })
            .option("github-mfa-token", {
                describe: "GitHub user password",
                requiresArg: true,
                type: "string",
            });
    }, argv => {
        config(argv)
            .then(status => process.exit(status), err => {
                console.error(`${Package}: Unhandled Error: ${err.message}`);
                process.exit(101);
            });
    })
    .showHelpOnFail(false, "Specify --help for available options")
    .alias("help", ["h", "?"])
    .version(readVersion())
    .alias("version", "v")
    .describe("version", "Show version information")
    .demandCommand(1, "Missing command")
    .strict()
    .argv;

function extractArgs(args) {
    return Object.getOwnPropertyNames(args)
        // .filter(k => !(k.includes("$") || k.includes("_")))
        .map(k => {
            return { name: k, value: args[k] };
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
