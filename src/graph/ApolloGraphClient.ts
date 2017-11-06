import { InMemoryCache } from "apollo-cache-inmemory";
import ApolloClient from "apollo-client";
import { ApolloLink } from "apollo-link";
import { createHttpLink } from "apollo-link-http";
import gql from "graphql-tag";
import "isomorphic-fetch";
import { logger } from "../internal/util/logger";
import { GraphClient } from "../spi/graph/GraphClient";
import { inlineQuery, resolveAndReadFileSync } from "./graphQL";

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
            operation.setContext({
                headers: { ...headers },
            });
            return forward(operation);
        });

        const link = middlewareLink.concat(httpLink);

        this.client = new ApolloClient({
            link,
            cache,
        });
    }

    public executeQueryFromFile<T, Q>(queryFile: string, variables?: Q, current?: string): Promise<T> {
        const graphql = resolveAndReadFileSync(queryFile);
        return this.executeQuery<T, Q>(graphql, variables);
    }

    public executeQuery<T, Q>(graphql: string, variables?: Q): Promise<T> {
        logger.debug(`Querying '%s' with variables '%s' and query: %s`,
            this.endpoint, JSON.stringify(variables), inlineQuery(graphql));

        const query = gql(graphql);
        return this.client.query<T>({
                query,
                variables,
            })
            .then(response => {
                // The following statement is needed for debugging; we can always disable that later
                logger.debug("Query returned data: %s", JSON.stringify(response.data));
                return response.data;
            });
    }

    public executeMutationFromFile<T, Q>(mutationFile: string, variables?: Q, current?: string): Promise<T> {
        const graphql = resolveAndReadFileSync(mutationFile);
        return this.executeMutation<T, Q>(graphql, variables);
    }

    public executeMutation<T, Q>(graphql: string, variables?: Q): Promise<any> {
        logger.debug(`Mutating '%s' with variables '%s' and mutation: %s`,
            this.endpoint, JSON.stringify(variables), inlineQuery(graphql));

        const mutation = gql(graphql);
        return this.client.mutate<T>({
                mutation,
                variables,
            })
            .then(response => {
                // The following statement is needed for debugging; we can always disable that later
                logger.debug("Mutation returned data: %s", JSON.stringify(response.data));
                return response.data;
            });
    }

}
