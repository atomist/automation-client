/**
 * Client for GraphQL operations. Provided to all handlers.
 */
export interface GraphClient {

    /**
     * GraphQL endpoint
     */
    endpoint: string;

    /**
     *
     * @param queryFile path under /graphql of the query file, without the .graphql extensions
     * @param variables for the query
     * @type T query return type
     * @type Q query type
     */
    executeFile<T, Q>(queryFile: string, variables?: Q): Promise<T>;

    /**
     * Run GraphQL query based on the provide quey and variables
     * @param {string} query
     * @param {Q} variables
     * @returns {Promise<T>}
     */
    executeQuery<T, Q>(query: string, variables?: Q): Promise<T>;
}
