import * as appRoot from "app-root-path";
import * as findUp from "find-up";
import * as fs from "fs";
import { buildClientSchema, GraphQLError, IntrospectionQuery, parse } from "graphql";
import gql from "graphql-tag";
import { validate } from "graphql/validation";
import { murmur3 } from "murmurhash-js/";
import * as p from "path";
import { findLine } from "../util/string";

// tslint:disable-next-line:no-var-requires
const schema = require("../../graph/schema.cortex.json");

const OperationParameterExpression = /(?:subscription|query)[\s]*([\S]*?)\s*(\([\S\s]*?\))\s*[\S\s]*?{/i;
const OperationNameExpression = /(subscription|query)[\s]*([^({\s]*)/i;
const FragmentExpression = /\.\.\.\s*([_A-Za-z][_0-9A-Za-z]*)/gi;

export class ParameterEnum {
    constructor(public value: string | string[]) {}
}

export function enumValue(value: string | string[]): ParameterEnum {
    return new ParameterEnum(value);
}

/**
 * see src/graph/graphQL.ts
 */
export function subscription(options: SubscriptionOptions): string {

    let s = options.subscription;
    const fragmentDir = options.fragmentDir;
    const path = options.path;
    const name = options.name;
    const pathToCallingFunction = options.moduleDir;

    // If subscription isn't defined attempt to load from file
    if (!s) {
        s = locateAndLoadGraphql({ path, name }, "subscription", pathToCallingFunction);
    }

    // Replace variables
    s = replaceParameters(s, options.variables);

    // Inline fragments
    s = inlineFragments(s, name, pathToCallingFunction, fragmentDir);

    if (options.operationName) {
        s = replaceOperationName(s, options.operationName);
    }

    // Inline entire subscription
    if (options.inline !== false) {
        s = inlineQuery(s);
    }
    return s;
}

export interface SubscriptionOptions {
    subscription?: string;
    path?: string;
    name?: string;
    fragmentDir?: string;
    inline?: boolean;
    variables?: {
        [name: string]: string | boolean | number | ParameterEnum;
    };
    operationName?: string;
    moduleDir?: string;
}

/**
 * Prepare a GraphQL query string for the use with Apollo.
 *
 * Queries can be provided by the following options:
 *
 * * query: string containing the subscription GraphQL, or
 * * path:  absolute or relative path to a .graphql file to load; if provided a relative
 *          path this will resolve the relative path to an absolute given the location
 *          of the calling script.
 * * name:  name of the .graphql file to load; this will walk up the directory structure
 *          starting at the location of the calling script and look for a folder called
 *          'graphql'. Once that folder is found, by convention name is being looked for
 *          in the 'query' sub directory.
 * * fragmentsDir: location of fragment .graphql files
 * * moduleDir: location of the calling script
 * * inline: remove any unneeded whitespace and line breaks from returned GraphQL string
 *
 * @param {{query?: string; path?: string; name?: string; fragmentDir?: string; moduleDir: string; inline?: boolean}} options
 * @returns {string}
 */
export function query<T, Q>(options: QueryOptions): string {
    let q = options.query;
    const fragmentDir = options.fragmentDir;
    const path = options.path;
    const name = options.name;

    // If query isn't defined attempt to load from file
    if (!q) {
        q = locateAndLoadGraphql({ path, name }, "query", options.moduleDir);
    }

    // Inline fragments
    q = inlineFragments(q, name, options.moduleDir, fragmentDir);

    // Inline entire query
    if (options.inline === true) {
        q = inlineQuery(q);
    }
    return q;
}

export interface QueryOptions {
    query?: string;
    path?: string;
    name?: string;
    fragmentDir?: string;
    moduleDir: string;
    inline?: boolean;
}

/**
 * Prepare a GraphQL mutation string for the use with Apollo.
 *
 * Mutations can be provided by the following options:
 *
 * * mutation: string containing the subscription GraphQL, or
 * * path:  absolute or relative path to a .graphql file to load; if provided a relative
 *          path this will resolve the relative path to an absolute given the location
 *          of the calling script.
 * * name:  name of the .graphql file to load; this will walk up the directory structure
 *          starting a t the location of the calling script and look for a folder called
 *          'graphql'. Once that folder is found, by convention name is being looked for
 *          in the 'mutation' sub directory.
 * * moduleDir: location of the calling script
 * * inline: remove any unneeded whitespace and line breaks from returned GraphQL string
 *
 * @param {{mutation?: string; path?: string; name?: string; moduleDir: string; inline?: boolean}} options
 * @returns {string}
 */
export function mutate<T, Q>(options: MutationOptions): string {

    let m = options.mutation;
    const path = options.path;
    const name = options.name;

    // If mutation isn't defined attempt to load from file
    if (!m) {
        m = locateAndLoadGraphql({ path, name }, "mutation", options.moduleDir);
    }

    // Inline entire mutation
    if (options.inline === true) {
        m = inlineQuery(m);
    }

    return m;
}

export interface MutationOptions {
    mutation?: string;
    path?: string;
    name?: string;
    moduleDir: string;
    inline?: boolean;
}

/**
 * Extract operationName from the provided query or subscription
 * @param {string} q
 * @returns {string}
 */
export function operationName(q: string): string {
    const graphql = parse(q);
    // TODO add some validation here
    return (graphql.definitions[0] as any).name.value;
}

/**
 * Inline the given query. Mainly useful for nicer log messages
 * @param {string} query
 * @returns {string}
 */
export function inlineQuery(q: string): string {
    return q.replace(/[\n\r]/g, "").replace(/\s\s+/g, " ");
}

/**
 * Replace the operation name in the query or subscription
 */
export function replaceOperationName(q: string, name: string): string {
    return q.replace(OperationNameExpression, `$1 ${name}`);
}

/**
 * Validate a query against our GraphQL schema
 * @param {string} query
 * @returns {GraphQLError[]}
 */
export function validateQuery(q: string): GraphQLError[] {
    const graphql = parse(q);
    const clientSchema = buildClientSchema(schema.data as IntrospectionQuery);
    return validate(clientSchema, graphql);
}

export function prettyPrintErrors(errors: GraphQLError[], q?: string): string {
    return errors.map(e => {
        let msg = `${e.message} ${e.locations.map(l => `[${l.line},${l.column}]`).join(", ")}`;
        if (q) {
            for (let i = 0; i < e.positions.length; i++) {
                msg += `\n${findLine(q, e.positions[i])}`;
                msg += `\n${Array(e.locations[i].column).join("-")}^`;
            }
        }
        return msg;
    }).join("\n\n");
}

export function replaceParameters(q: string,
                                  parameters: {
                               [name: string]: string | boolean | number | ParameterEnum;
                           } = {}): string {
    if (Object.keys(parameters).length > 0) {
        const exp = OperationParameterExpression;
        if (exp.test(q)) {
            const result = exp.exec(q);
            // First delete the parameter declaration at the top of the subscription
            q = q.replace(result[2], "");
            for (const key in parameters) {
                if (parameters.hasOwnProperty(key)) {
                    const value = parameters[key] as any;
                    // If value is defined it is a enum value
                    if (value.value) {
                        if (Array.isArray(value.value)) {
                            q = replace(q, `\\$${key}`, `[${value.value.join(", ")}]`);
                        } else {
                            q = replace(q, `\\$${key}`, value.value);
                        }
                    } else {
                        q = replace(q, `\\$${key}`, JSON.stringify(value));
                    }
                }
            }

            // Calulate hash to suffix the subscriptionName
            const hash = murmur3(q, 37);
            q = replaceOperationName(q, `${result[1]}_${hash}`);
        }
    }
    return q;
}

function replace(q: string, key: string, value: string): string {
    return q.replace(new RegExp(`${key}\\b`, "g"), value);
}

function inlineFragments(q: string, name: string, moduleDir: string, fragmentDir: string): string {

    if (!fragmentDir && !name) {
        fragmentDir = p.dirname(moduleDir);
    } else if (!fragmentDir && name) {
        fragmentDir = p.resolve(findUp.sync("graphql", { cwd: p.resolve(p.dirname(moduleDir)) }), "fragment");
    } else if (!p.isAbsolute(fragmentDir)) {
        fragmentDir = p.resolve(p.dirname(moduleDir), fragmentDir);
    }

    if (FragmentExpression.test(q)) {
        // Load all fragments
        const fragments = fs.readdirSync(fragmentDir).filter(f => f.endsWith(".graphql")).map(f => {
            const content = fs.readFileSync(p.join(fragmentDir, f)).toString();
            const graphql = gql(content);
            return {
                name: (graphql.definitions[0] as any).name.value,
                kind: (graphql.definitions[0] as any).kind,
                body: content.slice(content.indexOf("{") + 1, content.lastIndexOf("}") - 1),
            };
        }).filter(f => f.kind === "FragmentDefinition");

        FragmentExpression.lastIndex = 0;
        let result;

        // tslint:disable-next-line:no-conditional-assignment
        while (result = FragmentExpression.exec(q)) {
            const fragment = fragments.find(f => f.name === result[1]);
            if (fragment) {
                q = replace(q, result[0], fragment.body);
            } else {
                throw new Error(`Fragment '${result[1]}' can't be found in '${fragmentDir}'`);
            }
        }
    }
    return q;
}

function locateAndLoadGraphql(options: {
                                  path?: string,
                                  name?: string,
                              },
                              subfolder: string,
                              moduleDir: string): string {
    let path = options.path;
    let name = options.name;
    // Read subscription from file if given
    if (options.path) {
        if (!path.endsWith(".graphql")) {
            path = `${path}.graphql`;
        }
        if (!p.isAbsolute(path)) {
            path = p.resolve(p.dirname(moduleDir), path);
        }
    } else if (options.name) {
        const graphqlDir = findUp.sync("graphql", { cwd: p.resolve(p.dirname(moduleDir)) });
        if (graphqlDir) {
            if (!name.endsWith(".graphql")) {
                name = `${name}.graphql`;
            }
            path = p.resolve(graphqlDir, subfolder, name);
        }
    }

    if (fs.existsSync(path)) {
        return fs.readFileSync(path).toString();
    } else {
        throw new Error(`GraphQL file '${path}' does not exist`);
    }
}

export function resolveAndReadFileSync(path: string,
                                       current: string = appRoot.path,
                                       parameters: {
                                    [name: string]: string | boolean | number | ParameterEnum;
                                } = {}): string {
    if (!path.endsWith(".graphql")) {
        path = `${path}.graphql`;
    }
    const absolutePath = p.resolve(current, path);
    if (fs.existsSync(absolutePath)) {
        return replaceParameters(fs.readFileSync(absolutePath).toString(), parameters);
    } else {
        throw new Error(`GraphQL file '${absolutePath}' does not exist`);
    }
}
