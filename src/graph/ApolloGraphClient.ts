import { InMemoryCache } from "apollo-cache-inmemory";
import ApolloClient from "apollo-client";
import { ApolloLink } from "apollo-link";
import { createHttpLink } from "apollo-link-http";
import gql from "graphql-tag";
import "isomorphic-fetch";
import * as stringify from "json-stringify-safe";
import * as namespace from "../internal/util/cls";
import { logger } from "../internal/util/logger";
import { GraphClient } from "../spi/graph/GraphClient";
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

        const httpLink = createHttpLink({ uri: endpoint });
        const middlewareLink = new ApolloLink((operation, forward) => {
            // attach the correlation-id to the request
            const correlationId = namespace.get() ? namespace.get().correlationId : undefined;

            operation.setContext({
                headers: {
                    ...headers,
                    "correlation-id": correlationId,
                },
            });

            return forward(operation);
        });

        const link = middlewareLink.concat(httpLink);

        this.client = new ApolloClient({
            link,
            cache,
        });
    }

    public executeQueryFromFile<T, Q>(queryFile: string,
                                      variables?: Q,
                                      options?: any,
                                      current?: string): Promise<T> {
        return this.executeQuery<T, Q>(resolveAndReadFileSync(queryFile, current), variables, options);
    }

    public executeQuery<T, Q>(graphql: string,
                              variables?: Q,
                              options?: any): Promise<T> {
        logger.debug(`Querying '%s' with variables '%s' and query: %s`,
            this.endpoint, stringify(variables), inlineQuery(graphql));
        const query = gql(graphql);

        const callback = namespace.init().bind<Promise<T>>(response => {
            // The following statement is needed for debugging; we can always disable that later
            logger.debug("Query returned data: %s", stringify(response.data));
            return response.data;
        });

        return this.client.query<T>({
            query,
            variables,
            ...options,
        })
            .then(result => callback(result));
    }

    public executeMutationFromFile<T, Q>(mutationFile: string,
                                         variables?: Q,
                                         options?: any,
                                         current?: string): Promise<T> {
        return this.executeMutation<T, Q>(resolveAndReadFileSync(mutationFile, current), variables, options);
    }

    public executeMutation<T, Q>(graphql: string,
                                 variables?: Q,
                                 options?: any): Promise<any> {
        logger.debug(`Mutating '%s' with variables '%s' and mutation: %s`,
            this.endpoint, stringify(variables), inlineQuery(graphql));

        const mutation = gql(graphql);

        const callback = namespace.init().bind<Promise<T>>(response => {
            // The following statement is needed for debugging; we can always disable that later
            logger.debug("Mutation returned data: %s", stringify(response.data));
            return response.data;
        });

        return this.client.mutate<T>({
            mutation,
            variables,
            ...options,
        })
            .then(response => callback(response));
    }

}
