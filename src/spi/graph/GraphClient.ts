/**
 * Client for GraphQL operations. Provided to all handlers.
 */
export interface GraphClient {

    /**
     * GraphQL endpoint
     */
    endpoint: string;

    /**
     * Run GraphQL query based on the provided file name and variables
     * @param queryFile the relative path from module root to the graphql file
     * @param variables the variables to be used
     * @type T query return type
     * @type Q query type
     */
    executeQueryFromFile<T, Q>(queryFile: string, variables?: Q): Promise<T>;

    /**
     * Run GraphQL query based on the provide query and variables
     * @param {string} query the graphql mutation as string
     * @param {Q} variables the variables to be used
     * @returns {Promise<T>}
     */
    executeQuery<T, Q>(query: string, variables?: Q): Promise<T>;

    /**
     * Run GraphQL mutation based on the provided file name and variables
     * @param {string} mutationFile the relative path from module root to the graphql file
     * @param {Q} variables the variables to be used
     * @returns {Promise<T>}
     */
    executeMutationFromFile<T, Q>(mutationFile: string, variables?: Q): Promise<T>;

    /**
     * Run GraphQL mutation based on the provided mutation name and variables
     * @param {string} mutation the graphql mutation as string
     * @param {Q} variables the variables to be used
     * @returns {Promise<T>}
     */
    executeMutation<T, Q>(mutation: string, variables?: Q): Promise<T>;
}
