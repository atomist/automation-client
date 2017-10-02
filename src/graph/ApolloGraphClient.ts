import ApolloClient, { createNetworkInterface } from "apollo-client";
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
    public readonly client: ApolloClient;

    /**
     * Create a new GraphClient
     * @param endpoint GraphQL endpoint
     * @param headers any special headers to use
     */
    constructor(public endpoint: string, headers: any = {}) {
        const networkInterface = createNetworkInterface({
            uri: endpoint,
        });
        networkInterface.use([{
            applyMiddleware(req, next) {
                if (!req.options.headers) {
                    req.options.headers = {};  // Create the header object if needed.
                }
                req.options.headers = {
                    ...req.options.headers,
                    ...headers,
                };
                next();
            },
        }]);

        this.client = new ApolloClient({
            networkInterface,
        });
    }

    public executeFile<T, Q>(queryFile: string, variables?: Q): Promise<T> {
        const graphql = resolveAndReadFileSync(queryFile);
        return this.executeQuery<T, Q>(graphql, variables);
    }

    public executeQuery<T, Q>(graphql: string, variables?: Q): Promise<T> {
        logger.debug(`Querying '%s' with variables '%s' and query: %s`,
            this.endpoint, JSON.stringify(variables), inlineQuery(graphql));

        const Query = gql(graphql);
        return this.client.query<T>({
                query: Query,
                variables,
            })
            .then(response => {
                // The following statement is needed for debugging; we can always disable that later
                logger.debug("Query returned data: %s", JSON.stringify(response.data));
                return response.data;
            });
    }

}
