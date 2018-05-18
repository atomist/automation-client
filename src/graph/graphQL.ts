import * as appRoot from "app-root-path";
import { murmur3 } from "murmurhash-js/";
import * as trace from "stack-trace";
import { IngesterOptions } from "../internal/graph/graphQL";
import * as internalGraphQL from "../internal/graph/graphQL";
import { SubscriptionOptions } from "../internal/graph/graphQL";

export class ParameterEnum {
    constructor(public value: string | string[]) {
    }
}

export function enumValue(value: string | string[]): ParameterEnum {
    return new ParameterEnum(value);
}

/**
 * Prepare a GraphQL subscription string for the use with Apollo or EventHandlers.
 *
 * Subscription can be provided by the following options:
 *
 * * subscription: string containing the subscription GraphQL, or
 * * path:  absolute or relative path to a .graphql file to load; if provided a relative
 *          path this will resolve the relative path to an absolute given the location of
 *          the calling script.
 * * name:  name of the .graphql file to load; this will walk up the directory structure
 *          starting a t the location of the calling script and look for a folder called
 *          'graphql'. Once that folder is found, by convention name is being looked for
 *          in the 'subscription' sub directory.
 * * fragmentsDir: location of fragment .graphql files
 * * inline: remove any unneeded whitespace and line breaks from returned GraphQL string
 * * variables: the variables to bind into the subscription
 * * operationName: name of the subscription to use in the generated GraphQL string
 *
 * @param {{subscription?: string; path?: string; name?: string; fragmentDir?: string; inline?: boolean;
 *  variables?: {[p: string]: string | boolean | number | ParameterEnum}}} options
 * @returns {string}
 */
export function subscription(optionsOrName: SubscriptionOptions | string): string {
    const pathToCallingFunction = trace.get()[1].getFileName();

    let options: SubscriptionOptions;

    // Allow passing over a single string which would be the name of subscription file
    if (typeof optionsOrName === "string") {
        options = {
            name: optionsOrName,
        };
    } else {
        options = optionsOrName as SubscriptionOptions;
    }
    options.moduleDir = options.moduleDir || pathToCallingFunction;

    return internalGraphQL.subscription(options);
}

/**
 * Read a subscription from a file relative to the provided directory (or the module root by default)
 * Note: Use __dirname to get the current directory of the calling script.
 * @param {string} path
 * @param {string} current
 * @param {{[p: string]: string | boolean | number}} parameters
 * @returns {string}
 *
 * DEPRECATED: use subscription() instead
 */
export function subscriptionFromFile(path: string,
                                     current: string = appRoot.path,
                                     parameters: {
                                         [name: string]: string | boolean | number | ParameterEnum;
                                     } = {}): string {
    // TODO cd add validation that we only read subscriptions here
    return internalGraphQL.resolveAndReadFileSync(path, current, parameters);
}

/**
 * Prepare a GraphQL ingester SDL string for the register with the automation client.
 *
 * Ingester can be provided by the following options:
 *
 * * path:  absolute or relative path to a .graphql file to load; if provided a relative
 *          path this will resolve the relative path to an absolute given the location of
 *          the calling script.
 * * name:  name of the .graphql file to load; this will walk up the directory structure
 *          starting a t the location of the calling script and look for a folder called
 *          'graphql'. Once that folder is found, by convention name is being looked for
 *          in the 'ingester' sub directory.
 *
 * @param {IngesterOptions | string} optionsOrName
 * @returns {string}
 */
export function ingester(optionsOrName: IngesterOptions | string): string {
    const pathToCallingFunction = trace.get()[1].getFileName();

    let options: IngesterOptions;

    // Allow passing over a single string which would be the name of ingester file
    if (typeof optionsOrName === "string") {
        options = {
            name: optionsOrName,
        };
    } else {
        options = optionsOrName as IngesterOptions;
    }
    options.moduleDir = options.moduleDir || pathToCallingFunction;

    return internalGraphQL.ingester(options);
}
