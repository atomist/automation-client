/**
 * EventListener to retrieve notifications on incoming cortex events and command handler invocations.
 */
import { HandlerResult } from "../../HandlerResult";

// TODO CD I don't like this name here; it doesn't reflect what it does. Thinking ....
export interface TransportEventHandler {

    /**
     * A new commnad handler request haa been received.
     * @param {CommandIncoming} event
     * @param {(result: HandlerResult) => void} success
     * @param {(error: any) => void} error
     */
    onCommand(event: CommandIncoming, success?: (result: HandlerResult) => void, error?: (error: any) => void);

    /**
     * A new cortex event has been received.
     * @param {EventIncoming} command
     * @param {(results: HandlerResult[]) => void} success
     * @param {(error: any) => void} error
     */
    onEvent(command: EventIncoming, success?: (results: HandlerResult[]) => void, error?: (error: any) => void);
}

export function isCommandIncoming(event: any): event is CommandIncoming {
    return event.atomist_type === "command_handler_request";
}

export function isEventIncoming(event: any): event is EventIncoming {
    return !!event.data;
}

export interface EventIncoming {

    data: any;
    extensions: Extensions;
    secrets: Arg[];
}

export interface Extensions {

    team_id: string;
    operationName: string;
    correlation_id: string;
}

export interface CommandIncoming {

    rug: any;
    correlation_context: any;
    parameters: Arg[];
    mapped_parameters: Arg[];
    secrets: Arg[];
    name: string;
    corrid: string;
    team: Team;
    atomist_type: string;
}

export interface Team {

    id: string;
    name?: string;
    owner?: string;
    provider?: {
        id: string,
        api_url: string,
    };
}

export interface Arg {

    name: string;
    value: string;
}
