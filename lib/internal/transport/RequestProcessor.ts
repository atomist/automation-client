import { HandlerResult } from "../../HandlerResult";

/**
 * EventListener to retrieve notifications on incoming cortex events and command handler invocations.
 */
export interface RequestProcessor {

    /**
     * A new command handler request haa been received.
     * @param {CommandIncoming} command
     */
    processCommand(command: CommandIncoming): Promise<HandlerResult>;

    /**
     * A new cortex event has been received.
     * @param {EventIncoming} event
     */
    processEvent(event: EventIncoming): Promise<HandlerResult[]>;
}

export function isCommandIncoming(event: any): event is CommandIncoming {
    return !!event.command;
}

export function isEventIncoming(event: any): event is EventIncoming {
    return !!event.data;
}

export function workspaceId(event: CommandIncoming | EventIncoming): string | undefined {
    if (isCommandIncoming(event)) {
        return event.team.id;
    } else if (isEventIncoming(event)) {
        return event.extensions.team_id;
    }
    return undefined;
}

export interface EventIncoming {

    data: any;
    extensions: Extensions;
    secrets: Secret[];
}

export interface Extensions {

    team_id: string;
    team_name?: string;
    operationName: string;
    correlation_id: string;
}

export interface CommandIncoming {

    api_version?: string;
    correlation_id: string;
    command: string;
    team: Team;
    source: Source;
    parameters: Arg[];
    mapped_parameters: Arg[];
    secrets: Secret[];
}

export interface Source {
    user_agent: "slack" | "web";
    slack?: {
        team: {
            id: string;
            name?: string;
        };
        channel?: {
            id: string;
            name?: string;
        };
        user?: {
            id: string;
            name?: string;
        };
        thread_ts?: string;
    };
    web?: {
        identity: {
            sub: string;
            pid: string;
        },
    };
    identity?: any;
}

export interface Team {

    id: string;
    name?: string;
}

export interface Arg {

    name: string;
    value: string;
}

export interface Secret {

    uri: string;
    value: string;
}
