#!/usr/bin/env node
/*
 * Copyright © 2018 Atomist, Inc.
 *
 * See LICENSE file.
 */

process.env.SUPPRESS_NO_CONFIG_WARNING = "true";

import * as stringify from "json-stringify-safe";

import { automationClient } from "./automationClient";
import {
    Configuration,
    loadConfiguration,
} from "./configuration";
import { HandlerContext } from "./HandlerContext";
import { CommandInvocation } from "./internal/invoker/Payload";
import { consoleMessageClient } from "./internal/message/ConsoleMessageClient";
import { LoggingConfig } from "./internal/util/logger";
import { guid } from "./internal/util/string";
import { enableDefaultScanning } from "./scan";
import { AutomationServer } from "./server/AutomationServer";

LoggingConfig.format = "cli";

main();

/**
 * Parse command line CommandInvocation argument, set up, and call the
 * command handler.  This method will not return.
 */
async function main() {
    if (!process.argv[2]) {
        console.error(`[ERROR] Missing command, you must supply the CommandInvocation on the command line`);
        process.exit(3);
    }
    if (process.argv.length > 3) {
        console.warn(`[WARN] Extra command line arguments will be ignored: ${process.argv.slice(3).join(" ")}`);
    }
    const ciString = process.argv[2];
    try {
        const ci: CommandInvocation = JSON.parse(ciString);
        const configuration = await loadConfiguration();
        enableDefaultScanning(configuration);
        const node = automationClient(configuration);
        await invokeOnConsole(node.automationServer, ci, createHandlerContext(configuration));
    } catch (e) {
        console.error(`[ERROR] Unhandled exception: ${e.message}`);
        process.exit(101);
    }
    console.error(`[ERROR] Illegal state: unhandled execution path`);
    process.exit(99);
}

/**
 * Create a simple handler context for running command handlers from
 * the command line.
 */
function createHandlerContext(config: Configuration): HandlerContext {
    return {
        workspaceId: config.workspaceIds[0],
        correlationId: guid(),
        messageClient: consoleMessageClient,
    };
}

/**
 * Run a command handler on the command line.  This function will not
 * return.
 *
 * @param automationServer automation server with the command
 * @param ci command and its parameters
 * @param ctx suitable execution context
 */
async function invokeOnConsole(automationServer: AutomationServer, ci: CommandInvocation, ctx: HandlerContext) {

    // Set up the parameter, mappend parameters and secrets
    const handler = automationServer.automations.commands.find(c => c.name === ci.name);
    if (!handler) {
        const commands = automationServer.automations.commands.map(c => c.name).join(" ");
        console.error(`[ERROR] Unable to find command ${ci.name}, available commands: ${commands}`);
        process.exit(4);
    }
    const invocation: CommandInvocation = {
        name: ci.name,
        args: ci.args ? ci.args.filter(a =>
            handler.parameters.some(p => p.name === a.name)) : undefined,
        mappedParameters: ci.args ? ci.args.filter(a =>
            handler.mapped_parameters.some(p => p.name === a.name)) : undefined,
        secrets: ci.args ? ci.args.filter(a => handler.secrets.some(p => p.name === a.name))
            .map(a => {
                const s = handler.secrets.find(p => p.name === a.name);
                return { uri: s.uri, value: a.value };
            }) : undefined,
    };

    try {
        automationServer.validateCommandInvocation(invocation);
    } catch (e) {
        console.error(`[ERROR] Invalid parameters: ${e.message}`);
        process.exit(2);
    }
    try {
        const result = await automationServer.invokeCommand(invocation, ctx);
        console.log(`Command succeeded: ${stringify(result, null, 2)}`);
    } catch (e) {
        console.error(`[ERROR] Command failed: ${stringify(e, null, 2)}`);
        process.exit(1);
    }
    process.exit(0);
}
