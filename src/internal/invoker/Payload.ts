/**
 * Context common to an event or command handler.
 */
import { Source } from "../transport/RequestProcessor";

export interface Contextual {

    teamId: string;
    correlationId: string;
    invocationId?: string;
    source?: Source;
}

export interface Invocation {

    /**
     * Name of operation to invoke
     */
    name: string;
    mappedParameters?: Arg[];
    secrets?: Secret[];
}

/**
 * Argument to a command handler
 */
export interface Arg {

    name: string;
    value: string | string[];
}

/**
 * Secret to a command handler
 */
export interface Secret {

    uri: string;
    value: string | string[];
}

/**
 * Command handler, editor or generator invocation
 */
export interface CommandInvocation extends Invocation {

    args: Arg[];
}
