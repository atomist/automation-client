import * as appRoot from "app-root-path";
import { Configuration } from "./configuration";
import {
    HandleCommand,
    HandleEvent,
} from "./index";
import { logger } from "./internal/util/logger";
import { toStringArray } from "./internal/util/string";
import { Maker } from "./util/constructionUtils";

class HandlerRegistry {

    public commands: Array<Maker<HandleCommand>> = [];
    public events: Array<Maker<HandleEvent<any>>> = [];
    private scanForCommands: boolean = false;
    private scanForEvents: boolean = false;

    public registerCommand(command: any) {
        if (this.scanForCommands) {
            logger.debug(`Registered command '${command.name}'`);
            if (typeof command === "function") {
                this.commands.push(command);
            } else {
                this.commands.push(() => Object.create(command));
            }
        }
    }

    public registerEvent(event: any) {
        if (this.scanForEvents) {
            logger.debug(`Registered event '${event.name}'`);
            if (typeof event === "function") {
                this.events.push(event);
            } else {
                this.events.push(() => Object.create(event));
            }
        }
    }

    public start(commands: boolean, events: boolean) {
        this.commands = [];
        this.scanForCommands = commands;

        this.events = [];
        this.scanForEvents = events;
    }
}

const registry = new HandlerRegistry();

export function registerCommand(command: any) {
    registry.registerCommand(command);
}

export function registerEvent(event: any) {
    registry.registerEvent(event);
}

/*
 * Scan the node module/project for command handlers.
 * Optional glob patterns can be specified to narrow the search.
 */
export function scanCommands(patterns: string | string[] =
                                 [ "**/handlers/commands/**/*.js" ]): Array<Maker<HandleCommand>> {
    registry.start(true, false);
    // tslint:disable-next-line:variable-name
    const _patterns = toStringArray(patterns);
    logger.info(`Scanning for commands using file patterns: ${_patterns.join(", ")}`);
    scan(_patterns);
    logger.debug(`Completed scanning for commands`);
    return registry.commands;
}

/*
 * Scan the node module/project for event handlers.
 * Optional glob patterns can be specified to narrow the search.
 */
export function scanEvents(patterns: string | string[] =
                               [ "**/handlers/events/**/*.js" ]): Array<Maker<HandleEvent<any>>> {
    registry.start(false, true);
    // tslint:disable-next-line:variable-name
    const _patterns = toStringArray(patterns);
    logger.info(`Scanning for events using file patterns: ${_patterns.join(", ")}`);
    scan(_patterns);
    logger.debug(`Completed scanning for events`);
    return registry.events;
}

/*
 * Enable scanning on the given Configuration instance.
 */
export function enableDefaultScanning(configuration: Configuration): Configuration {
    if (configuration.commands === undefined) {
        configuration.commands = scanCommands();
    }
    if (configuration.events === undefined) {
        configuration.events = scanEvents();
    }
    return configuration;
}

function scan(patterns: string[]) {
    const glob = require("glob");
    patterns.forEach(pattern => {
        const files = glob.sync(pattern, { ignore: [ "node_modules/**", "**/*Test.js", "**/*Tests.js" ] });
        files.forEach(f => safeRequire(f));
    });
}

function safeRequire(file: string) {
    try {
        logger.debug(`Scanning file '${file}'`);
        require(`${appRoot.path}/${file}`);
    } catch (err) {
        logger.warn(`Can't require '${file}': ${err.message}`);
    }
}
