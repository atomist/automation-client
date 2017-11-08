#!/usr/bin/env node

import { LoggingConfig } from "../internal/util/logger";
process.env.SUPPRESS_NO_CONFIG_WARNING = "true";
LoggingConfig.format = "cli";

import * as yargs from "yargs";
import { automationClient } from "../automationClient";
import {
    Configuration,
    findConfiguration,
} from "../configuration";
import { HandlerContext } from "../HandlerContext";
import { CommandInvocation } from "../internal/invoker/Payload";
import { consoleMessageClient } from "../internal/message/ConsoleMessageClient";
import { guid } from "../internal/util/string";

import { AutomationServer } from "../server/AutomationServer";

if (yargs.argv.request) {
    try {
        const request: CommandInvocation = JSON.parse(yargs.argv.request);
        const config = findConfiguration();
        const node = automationClient(config);

        if (config.commands) {
            config.commands.forEach(c => {
                node.withCommandHandler(c);
            });
        }

        invokeOnConsole(node.automationServer, request, createHandlerContext(config));
    } catch (e) {
        console.error(`Error: ${e.message}`);
        process.exit(1);
    }
} else {
    console.log("Error: Missing command request");
    process.exit(1);
}

function createHandlerContext(config: Configuration): HandlerContext {
    return {
        teamId: config.teamIds[0],
        correlationId: guid(),
        messageClient: consoleMessageClient,
    };
}

function invokeOnConsole(automationServer: AutomationServer, ci: CommandInvocation, ctx: HandlerContext) {

    // Set up the parameter, mappend parameters and secrets
    const handler = automationServer.automations.commands.find(c => c.name === ci.name);
    const invocation: CommandInvocation = {
        name: ci.name,
        args: ci.args ? ci.args.filter(a =>
            handler.parameters.some(p => p.name === a.name)) : undefined,
        mappedParameters: ci.args ? ci.args.filter(a =>
            handler.mapped_parameters.some(p => p.local_key === a.name)) : undefined,
        secrets: ci.args ? ci.args.filter(a => handler.secrets.some(p => p.name === a.name))
            .map(a => {
                const s = handler.secrets.find(p => p.name === a.name);
                return { name: s.path, value: a.value};
            }) : undefined,
    };

    try {
        automationServer.validateCommandInvocation(invocation);
    } catch (e) {
        console.log("Error: Invalid parameters: %s", e.message);
        process.exit(1);
    }
    try {
        automationServer.invokeCommand(invocation, ctx)
            .then(r => {
                console.log(`Command succeeded: ${JSON.stringify(r, null, 2)}`);
                process.exit(0);
            })
            .catch(err => {
                console.log(`Error: Command failed: ${JSON.stringify(err, null, 2)}`);
                process.exit(1);
            });
    } catch (e) {
        console.log("Error: Command failed: %s", e.message);
        process.exit(1);
    }
}
