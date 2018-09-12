import { InMemoryCache } from "apollo-cache-inmemory";
import ApolloClient from "apollo-client";
import { ApolloLink } from "apollo-link";
import { createHttpLink } from "apollo-link-http";
import axios from "axios";
import { buildAxiosFetch } from "axios-fetch";
import gql from "graphql-tag";
import * as stringify from "json-stringify-safe";
import * as trace from "stack-trace";
import * as internalGraphql from "../internal/graph/graphQL";
import * as namespace from "../internal/util/cls";
import { configureProxy } from "../internal/util/http";
import { logger } from "../util/logger";
import {
    GraphClient,
    MutationOptions,
    QueryOptions,
} from "../spi/graph/GraphClient";

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
     */
    constructor(public endpoint: string, headers: any = {}) {
        const cache = new InMemoryCache({
            addTypename: false,
        });

        const httpLink = createHttpLink({
            uri: endpoint,
            fetch: buildAxiosFetch(axios.create(configureProxy({}))),
        });

        const middlewareLink = new ApolloLink((operation, forward) => {
            // attach the correlation-id to the request
            const correlationId = namespace.get() ? namespace.get().correlationId : undefined;
            if (correlationId) {
                operation.setContext({
                    headers: {
                        ...headers,
                        "correlation-id": correlationId,
                    },
                });
            } else {
                operation.setContext({
                    headers: {
                        ...headers,
                    },
                });
            }
            return forward(operation);
        });

        const link = middlewareLink.concat(httpLink);

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
        logger.debug(`Querying '%s' with variables '%s' and query: %s`,
            this.endpoint, stringify(variables), internalGraphql.inlineQuery(q));
        const query = gql(q);

        const callback = namespace.init().bind<Promise<T>>(response => {
            // The following statement is needed for debugging; we can always disable that later
            logger.debug("Query returned data: %s", stringify(response.data));
            return response.data;
        });

        return this.client.query<T>({
                query,
                variables,
                errorPolicy: "all",
                ...queryOptions,
            })
            .then(result => callback(result));
    }

    private executeMutation<T, Q>(m: string,
                                  variables?: Q,
                                  mutationOptions?: any): Promise<any> {
        logger.debug(`Mutating '%s' with variables '%s' and mutation: %s`,
            this.endpoint, stringify(variables), internalGraphql.inlineQuery(m));

        const mutation = gql(m);

        const callback = namespace.init().bind<Promise<T>>(response => {
            // The following statement is needed for debugging; we can always disable that later
            logger.debug("Mutation returned data: %s", stringify(response.data));
            return response.data;
        });

        return this.client.mutate<T>({
                mutation,
                variables,
                errorPolicy: "all",
                ...mutationOptions,
            })
            .then(response => callback(response));
    }

}
