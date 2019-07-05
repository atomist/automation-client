import { InMemoryCache } from "apollo-cache-inmemory";
import ApolloClient from "apollo-client";
import { ApolloLink } from "apollo-link";
import { onError } from "apollo-link-error";
import { createHttpLink } from "apollo-link-http";
import axios from "axios";
import { buildAxiosFetch } from "axios-fetch";
import gql, { disableFragmentWarnings } from "graphql-tag";
import * as stringify from "json-stringify-safe";
import * as trace from "stack-trace";
import * as internalGraphql from "../internal/graph/graphQL";
import * as namespace from "../internal/util/cls";
import { configureProxy } from "../internal/util/http";
import {
    guid,
    replacer,
} from "../internal/util/string";
import {
    GraphClient,
    MutationOptions,
    QueryOptions,
} from "../spi/graph/GraphClient";
import { logger } from "../util/logger";

disableFragmentWarnings();

/**
 * Implementation of GraphClient using Apollo Client.
 */
export class ApolloGraphClient implements GraphClient {

    /**
     * Configured Apollo Client instance subclasses can use directly
     */
    public readonly client: ApolloClient<any>;

    /**
     * Create a new GraphClient
     * @param endpoint GraphQL endpoint
     * @param headers any special headers to use
     * @param fetch configured GlobalFetch instance to use for this GraphClient
     */
    constructor(public endpoint: string,
                headers: any = {},
                fetch: GlobalFetch["fetch"] = buildAxiosFetch(axios.create(configureProxy({})))) {
        const cache = new InMemoryCache({
            addTypename: false,
        });

        const httpLink = createHttpLink({
            uri: endpoint,
            fetch,
        });

        const middlewareLink = new ApolloLink((operation, forward) => {
            // attach the correlation-id to the request
            const correlationId = namespace.get() ? namespace.get().correlationId : undefined;
            if (!!correlationId) {
                headers["correlation-id"] = correlationId;
            }

            const invocationId = namespace.get() ? namespace.get().invocationId : guid();
            if (!!invocationId) {
                headers["x-request-id"] = invocationId;
            }
            operation.setContext({
                headers,
            });

            return forward(operation);
        });

        const errorLink = onError(({ graphQLErrors, networkError, response }) => {
            let msg = `GraphQL operation failed:`;
            if (!!graphQLErrors) {
                const g = graphQLErrors.map(({ message }) =>
                    ` [GraphQL]: ${message}`,
                );
                msg += `${g.join(" ")}`;
            }

            if (!!networkError) {
                msg += ` [Network]: ${networkError}`;
            }
            if (!!response) {
                msg += ` [Response]: ${stringify(response, replacer)}`;
            }

            logger.error(msg);
        });

        const link = errorLink.concat(middlewareLink.concat(httpLink));

        this.client = new ApolloClient({
            link,
            cache,
        });
    }

    public query<T, Q>(options: QueryOptions<Q> | string): Promise<T> {
        if (typeof options === "string") {
            options = {
                name: options,
            };
        }
        const q = internalGraphql.query({
            query: options.query,
            path: options.path,
            name: options.name,
            moduleDir: (options as any).moduleDir ? (options as any).moduleDir : trace.get()[1].getFileName(),
        });
        return this.executeQuery<T, Q>(q, options.variables, options.options);
    }

    public mutate<T, Q>(options: MutationOptions<Q> | string): Promise<T> {
        if (typeof options === "string") {
            options = {
                name: options,
            };
        }
        const m = internalGraphql.mutate({
            mutation: options.mutation,
            path: options.path,
            name: options.name,
            moduleDir: (options as any).moduleDir ? (options as any).moduleDir : trace.get()[1].getFileName(),
        });
        return this.executeMutation<T, Q>(m, options.variables, options.options);
    }

    private executeQuery<T, Q>(q: string,
                               variables?: Q,
                               queryOptions?: any): Promise<T> {
        const log = !queryOptions ||
            (queryOptions && queryOptions.log === undefined) ||
            (queryOptions && queryOptions.log === true);

        if (log) {
            logger.debug(`Querying '%s' with variables '%s' and query: %s`,
                this.endpoint, stringify(variables || {}), internalGraphql.inlineQuery(q));
        }
        const query = gql(q);

        return this.client.query<T>({
            query,
            variables,
            errorPolicy: "all",
            ...queryOptions,
        })
            .then(result => {
                if (log) {
                    // The following statement is needed for debugging; we can always disable that later
                    logger.debug("Query returned data: %s", stringify(result.data, replacer));
                }
                return result.data;
            });
    }

    private executeMutation<T, Q>(m: string,
                                  variables?: Q,
                                  mutationOptions?: any): Promise<any> {
        const log = !mutationOptions ||
            (mutationOptions && mutationOptions.log === undefined) ||
            (mutationOptions && mutationOptions.log === true);

        if (log) {
            logger.debug(`Mutating '%s' with variables '%s' and mutation: %s`,
                this.endpoint, stringify(variables || {}), internalGraphql.inlineQuery(m));
        }

        const mutation = gql(m);

        return this.client.mutate<T>({
            mutation,
            variables,
            errorPolicy: "all",
            ...mutationOptions,
        })
            .then(response => {
                if (log) {
                    // The following statement is needed for debugging; we can always disable that later
                    logger.debug("Mutation returned data: %s", stringify(response.data, replacer));
                }
                return response.data;
            });
    }

}
