import { HandlerResult } from "../../HandlerResult";

/**
 * EventListener to retrieve notications on incoming cortex events and command handler invocations.
 */
export interface AutomationEventListener {

    /**
     * A new commnad handler request haa been received.
     * @param {CommandIncoming} event
     * @returns {Promise<HandlerResult>}
     */
    onCommand(event: CommandIncoming): Promise<HandlerResult>;

    /**
     * A new cortex event has been received.
     * @param {EventIncoming} command
     * @returns {Promise<HandlerResult[]>}
     */
    onEvent(command: EventIncoming): Promise<HandlerResult[]>;
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
