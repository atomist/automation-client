import { InMemoryCache } from "apollo-cache-inmemory";
import ApolloClient from "apollo-client";
import { ApolloLink } from "apollo-link";
import { createHttpLink } from "apollo-link-http";
import axios from "axios";
import { buildAxiosFetch } from "axios-fetch";
import gql from "graphql-tag";
import * as stringify from "json-stringify-safe";
import * as trace from "stack-trace";
import * as namespace from "../internal/util/cls";
import { configureProxy } from "../internal/util/http";
import { logger } from "../internal/util/logger";
import { GraphClient } from "../spi/graph/GraphClient";
import * as graphql from "./graphQL";
import {
    inlineQuery,
    resolveAndReadFileSync,
} from "./graphQL";

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

    public query<T, Q>(options: {
                            query?: string,
                            path?: string,
                            name?: string,
                            fragmentDir?: string,
                            variables?: Q,
                            options?: any,
                        }): Promise<T> {
        const q = graphql.query({
            query: options.query,
            path: options.path,
            name: options.name,
            moduleDir: trace.get()[1].getFileName(),
        });
        return this.executeQuery<T, Q>(q, options.variables, options.options);
    }

    public executeQueryFromFile<T, Q>(queryFile: string,
                                      variables?: Q,
                                      queryOptions?: any,
                                      current?: string): Promise<T> {
        return this.executeQuery<T, Q>(
            resolveAndReadFileSync(queryFile, current, {}), variables, queryOptions);
    }

    public executeQuery<T, Q>(q: string,
                              variables?: Q,
                              queryOptions?: any): Promise<T> {
        logger.debug(`Querying '%s' with variables '%s' and query: %s`,
            this.endpoint, stringify(variables), inlineQuery(q));
        const query = gql(q);

        const callback = namespace.init().bind<Promise<T>>(response => {
            // The following statement is needed for debugging; we can always disable that later
            logger.debug("Query returned data: %s", stringify(response.data));
            return response.data;
        });

        return this.client.query<T>({
                query,
                variables,
                ...queryOptions,
            })
            .then(result => callback(result));
    }

    public mutate<T, Q>(options: {
                            mutation?: string,
                            path?: string,
                            name?: string,
                            variables?: Q,
                            options?: any,
                        }): Promise<T> {
        const m = graphql.mutate({
            mutation: options.mutation,
            path: options.path,
            name: options.name,
            moduleDir: trace.get()[1].getFileName(),
        });
        return this.executeMutation<T, Q>(m, options.variables, options.options);
    }

    public executeMutationFromFile<T, Q>(mutationFile: string,
                                         variables?: Q,
                                         mutationOptions?: any,
                                         current?: string): Promise<T> {
        return this.executeMutation<T, Q>(
            resolveAndReadFileSync(mutationFile, current, {}), variables, mutationOptions);
    }

    public executeMutation<T, Q>(m: string,
                                 variables?: Q,
                                 mutationOptions?: any): Promise<any> {
        logger.debug(`Mutating '%s' with variables '%s' and mutation: %s`,
            this.endpoint, stringify(variables), inlineQuery(m));

        const mutation = gql(m);

        const callback = namespace.init().bind<Promise<T>>(response => {
            // The following statement is needed for debugging; we can always disable that later
            logger.debug("Mutation returned data: %s", stringify(response.data));
            return response.data;
        });

        return this.client.mutate<T>({
                mutation,
                variables,
                ...mutationOptions,
            })
            .then(response => callback(response));
    }

}
