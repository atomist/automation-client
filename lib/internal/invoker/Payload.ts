/**
 * Context common to an event or command handler.
 */
import { Source } from "../transport/RequestProcessor";

export interface Contextual {

    /**
     * ID of the Atomist Workspace
     */
    workspaceId: string;

    /**
     * Correlation Id for this invocation
     * Note: there can be more then one handler invocations per unique
     * correlation id occurring.
     */
    correlationId: string;

    /**
     * Client internal unique Id of the current handler invocation
     */
    invocationId?: string;

    /**
     * Source of the request, eg. Slack, Dashboard or HTTP
     */
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
