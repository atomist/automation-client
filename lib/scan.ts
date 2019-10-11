import * as appRoot from "app-root-path";
import * as fg from "fast-glob";
import { Configuration } from "./configuration";
import { HandleCommand } from "./HandleCommand";
import { HandleEvent } from "./HandleEvent";
import { toStringArray } from "./internal/util/string";
import { Maker } from "./util/constructionUtils";
import { logger } from "./util/logger";

class HandlerRegistry {

    public commands: Array<Maker<HandleCommand>> = [];
    public events: Array<Maker<HandleEvent<any>>> = [];
    private scanForCommands: boolean = false;
    private scanForEvents: boolean = false;

    public registerCommand(command: any): void {
        if (this.scanForCommands) {
            logger.debug(`Registered command '${command.name}'`);
            if (typeof command === "function") {
                this.commands.push(command);
            } else {
                this.commands.push(() => Object.create(command));
            }
        }
    }

    public registerEvent(event: any): void {
        if (this.scanForEvents) {
            logger.debug(`Registered event '${event.name}'`);
            if (typeof event === "function") {
                this.events.push(event);
            } else {
                this.events.push(() => Object.create(event));
            }
        }
    }

    public start(commands: boolean, events: boolean): void {
        this.commands = [];
        this.scanForCommands = commands;

        this.events = [];
        this.scanForEvents = events;
    }
}

const registry = new HandlerRegistry();

export function registerCommand(command: any): void {
    registry.registerCommand(command);
}

export function registerEvent(event: any): void {
    registry.registerEvent(event);
}

/*
 * Scan the node module/project for command handlers.
 * Optional glob patterns can be specified to narrow the search.
 */
export function scanCommands(patterns: string | string[] =
    ["**/commands/**/*.js"]): Array<Maker<HandleCommand>> {
    registry.start(true, false);
    // tslint:disable-next-line:variable-name
    const _patterns = toStringArray(patterns);
    logger.debug(`Scanning for commands using file patterns: ${_patterns.join(", ")}`);
    scan(_patterns);
    logger.debug(`Completed scanning for commands`);
    return registry.commands;
}

/*
 * Scan the node module/project for event handlers.
 * Optional glob patterns can be specified to narrow the search.
 */
export function scanEvents(patterns: string | string[] =
    ["**/events/**/*.js"]): Array<Maker<HandleEvent<any>>> {
    registry.start(false, true);
    // tslint:disable-next-line:variable-name
    const _patterns = toStringArray(patterns);
    logger.debug(`Scanning for events using file patterns: ${_patterns.join(", ")}`);
    scan(_patterns);
    logger.debug(`Completed scanning for events`);
    return registry.events;
}

/*
 * Enable scanning on the given Configuration instance.
 */
export function enableDefaultScanning(configuration: Configuration): Configuration {
    if (!configuration.commands) {
        configuration.commands = scanCommands();
    }
    if (!configuration.events) {
        configuration.events = scanEvents();
    }
    return configuration;
}

function scan(patterns: string[]): void {
    const ignore = ["**/node_modules/**", "**/.git/**", "**/*Test.js", "**/*Tests.js"];
    patterns.forEach(pattern => {
        const files = fg.sync(pattern, { ignore });
        files.forEach(safeRequire);
    });
}

function safeRequire(file: string): void {
    try {
        logger.debug(`Scanning file '${file}'`);
        require(`${appRoot.path}/${file}`);
    } catch (err) {
        logger.warn(`Can't require '${file}': ${err.message}`);
    }
}
