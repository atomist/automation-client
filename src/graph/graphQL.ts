import * as appRoot from "app-root-path";
import * as fs from "fs";
import {
    buildClientSchema,
    GraphQLError,
    IntrospectionQuery,
    parse,
} from "graphql";
import { validate } from "graphql/validation";
import { findLine } from "../internal/util/string";

// tslint:disable-next-line:no-var-requires
const schema = require("./schema.cortex.json");

export function subscriptionFromFile(path: string): string {
    if (!path.endsWith(".graphql")) {
        path = `${path}.graphql`;
    }
    if (!path.startsWith("/")) {
        path = `${appRoot}/${path}`;
    }
    if (fs.existsSync(path)) {
        return fs.readFileSync(path).toString();
    } else {
        throw new Error(`GraphQL file '${path}' does not exist`);
    }
}

export function operationName(query: string): string {
    const graphql = parse(query);
    // TODO add some validation here
    return (graphql.definitions[0] as any).name.value;
}

export function inlineQuery(query: string): string {
    return query.replace(/[\n\r]/g, "").replace(/\s\s+/g, " ");
}

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
