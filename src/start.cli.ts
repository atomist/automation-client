#!/usr/bin/env node

import * as yargs from "yargs";
import { automationClient } from "./automationClient";
import { findConfiguration } from "./configuration";
import { HandlerContext } from "./HandlerContext";
import { Arg, CommandInvocation } from "./internal/invoker/Payload";
import { consoleMessageClient } from "./internal/message/ConsoleMessageClient";
import { guid } from "./internal/util/string";
import { AutomationServer } from "./server/AutomationServer";

const config = findConfiguration();
const node = automationClient(config);

if (config.commands) {
    config.commands.forEach(c => {
        node.withCommandHandler(c);
    });
}
if (config.events) {
    config.events.forEach(e => {
        node.withEventHandler(e);
    });
}

if (config.ingestors) {
    config.ingestors.forEach(e => {
        node.withIngestor(e);
    });
}

const argv = yargs.argv;

// tslint:disable-next-line:no-unused-expression
yargs.completion("completion")
    .command("run", "Run a command", ya => {
        const subArgv = ya
            .option("command", {
                describe: "Command name",
            })
            .argv;

        const args = extractArgs(argv);
        const ci: CommandInvocation = {
            name: argv.command,
            args,
        };
        invokeOnConsole(node.automationServer, ci, createHandlerContext());
    })
    .argv;

function createHandlerContext(): HandlerContext {
    return {
        teamId: config.teamId,
        correlationId: guid(),
        messageClient: consoleMessageClient,
    };
}

function extractArgs(args): Arg[] {
    return Object.getOwnPropertyNames(args)
        .filter(k => !(k.includes("$") || k.includes("_")))
        .map(k => {
            return { name: k, value: args[k] };
        });
}

function invokeOnConsole(automationServer: AutomationServer, ci: CommandInvocation, ctx: HandlerContext) {
    try {
        automationServer.validateCommandInvocation(ci);
    } catch (e) {
        console.log("Invalid parameters: %s", e.message);
        process.exit(1);
    }
    automationServer.invokeCommand(ci, ctx)
        .then(r => {
            console.log(`Command succeeded: ${JSON.stringify(r, null, 2)}`);
        })
        .catch(err => {
            console.log(`Command failed: ${JSON.stringify(err, null, 2)}`);
            process.exit(1);
        });
}
