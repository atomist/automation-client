
import { HandlerResult } from "../../HandlerResult";

/**
 * EventListener to retrieve notifications on incoming cortex events and command handler invocations.
 */
export interface RequestProcessor {

    /**
     * A new command handler request haa been received.
     * @param {CommandIncoming} command
     * @param {(result: HandlerResult) => void} callback
     * @param {(error: any) => void} error
     */
    processCommand(command: CommandIncoming, callback?: (result: Promise<HandlerResult>) => void);

    /**
     * A new cortex event has been received.
     * @param {EventIncoming} event
     * @param {(results: HandlerResult[]) => void} callback
     * @param {(error: any) => void} error
     */
    processEvent(event: EventIncoming, callback?: (results: Promise<HandlerResult[]>) => void);
}

export function isCommandIncoming(event: any): event is CommandIncoming {
    return !!event.command;
}

export function isEventIncoming(event: any): event is EventIncoming {
    return !!event.data;
}

export function workspaceId(event: CommandIncoming | EventIncoming): string {
    if (isCommandIncoming(event)) {
        return event.team.id;
    } else if (isEventIncoming(event)) {
        return event.extensions.team_id;
    }
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
    user_agent: "slack";
    slack?: {
        team: {
            id: string;
        };
        channel?: {
            id: string;
        };
        user?: {
            id: string;
        };
        thread_ts?: string;
    };
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
