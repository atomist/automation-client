import * as appRoot from "app-root-path";
import * as fs from "fs";
import {
    buildClientSchema,
    GraphQLError,
    IntrospectionQuery,
    parse,
} from "graphql";
import gql from "graphql-tag";
import { validate } from "graphql/validation";
import * as p from "path";
import { findLine } from "../internal/util/string";

// tslint:disable-next-line:no-var-requires
const schema = require("./schema.cortex.json");

/**
 * Read a subscription from a file relative to the provided directory (or the module root by default)
 * Note: Use __dirname to get the current directory of the calling script.
 * @param {string} path
 * @param {string} current
 * @param {{[p: string]: string | boolean | number}} parameters
 * @returns {string}
 */
export function subscriptionFromFile(path: string,
                                     current: string = appRoot.path,
                                     parameters: {
                                        [name: string]: string | boolean | number;
                                     } = {}): string {
    // TODO cd add validation that we only read subscriptions here
    return resolveAndReadFileSync(path, current, parameters);
}

/**
 * Extract operationName from the provided query or subscription
 * @param {string} query
 * @returns {string}
 */
export function operationName(query: string): string {
    const graphql = parse(query);
    // TODO add some validation here
    return (graphql.definitions[0] as any).name.value;
}

/**
 * Inline the given query. Mainly useful for nicer log messages
 * @param {string} query
 * @returns {string}
 */
export function inlineQuery(query: string): string {
    return query.replace(/[\n\r]/g, "").replace(/\s\s+/g, " ");
}

/**
 * Validate a query against our GraphQL schema
 * @param {string} query
 * @returns {GraphQLError[]}
 */
export function validateQuery(query: string): GraphQLError[] {
    const graphql = parse(query);
    const clientSchema = buildClientSchema(schema.data as IntrospectionQuery);
    return validate(clientSchema, graphql);
}

export function prettyPrintErrors(errors: GraphQLError[], query?: string): string {
    return errors.map(e => {
        let msg = `${e.message} ${e.locations.map(l => `[${l.line},${l.column}]`).join(", ")}`;
        if (query) {
            for (let i = 0; i < e.positions.length; i++) {
                msg += `\n${findLine(query, e.positions[i])}`;
                msg += `\n${Array(e.locations[i].column).join("-")}^`;
            }
        }
        return msg;
    }).join("\n\n");
}

/**
 * Resolve and read the contents of a GrapqQL query or subscription file
 * @param {string} path
 * @param {string} current
 * @param {{[p: string]: string | boolean | number}} parameters
 * @returns {string}
 */
export function resolveAndReadFileSync(path: string,
                                       current: string = appRoot.path,
                                       parameters: {
                                           [name: string]: string | boolean | number;
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

function replaceParameters(query: string,
                           parameters: {
                                [name: string]: string | boolean | number;
                            } = {}): string {
    const exp = /subscription[\S\s]*?(\([\S\s]*?\))[\S\s]*?{/i;
    if (exp.test(query)) {
        query = query.replace(exp.exec(query)[1], "");
        for (const key in parameters) {
            if (parameters.hasOwnProperty(key)) {
                query = query.replace(new RegExp(`\\$${key}\\b`, "g"), JSON.stringify(parameters[key]));
            }
        }
    }
    return query;
}
