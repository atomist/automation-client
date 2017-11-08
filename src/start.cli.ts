#!/usr/bin/env node

import * as yargs from "yargs";
import { Arg, CommandInvocation } from "./internal/invoker/Payload";
import { LoggingConfig } from "./internal/util/logger";
import { config, gitInfo, install, run, start } from "./scripts/commands";

LoggingConfig.format = "cli";

// tslint:disable-next-line:no-unused-expression
yargs.completion("completion")
    .command("run <name>", "Run a command", ya => {
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
    .command(["start", "st"], "Start an automation client", ya => {
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
    // .version(require("../package.json").version)
    .argv;

function extractArgs(args): Arg[] {
    return Object.getOwnPropertyNames(args)
        // .filter(k => !(k.includes("$") || k.includes("_")))
        .map(k => {
            return { name: k, value: args[k] };
        });
}
