/**
 * Context common to an event or command handler.
 */
export interface Contextual {

    teamId: string;
    correlationId: string;
}

export interface Invocation {

    /**
     * Name of operation to invoke
     */
    name: string;
    mappedParameters?: Arg[];
    secrets?: Arg[];
}

/**
 * Argument to a command handler
 */
export interface Arg {

    name: string;
    value: string;
}

/**
 * Command handler, editor or generator invocation
 */
export interface CommandInvocation extends Invocation {

    args: Arg[];
}
