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
     * @param {string} path the relative path from module root to the graphql file
     * @param {Q} variables the variables to be used
     * @param {any} options to be passed onto the underlying implementation
     * @param {string} current the path to the calling script
     * @returns {Promise<T>}
     */
    executeQueryFromFile<T, Q>(path: string, variables?: Q, options?: any, current?: string): Promise<T>;

    /**
     * Run GraphQL query based on the provide query and variables
     * @param {string} query the graphql mutation as string
     * @param {Q} variables the variables to be used
     * @param {any} options to be passed onto the underlying implementation
     * @returns {Promise<T>}
     */
    executeQuery<T, Q>(query: string, variables?: Q, options?: any): Promise<T>;

    /**
     * Run GraphQL mutation based on the provided file name and variables
     * @param {string} path the relative path from module root to the graphql file
     * @param {Q} variables the variables to be used
     * @param {any} options to be passed onto the underlying implementation
     * @param {string} current the path to the calling script
     * @returns {Promise<T>}
     */
    executeMutationFromFile<T, Q>(path: string, variables?: Q, options?: any, current?: string): Promise<T>;

    /**
     * Run GraphQL mutation based on the provided mutation name and variables
     * @param {string} mutation the graphql mutation as string
     * @param {Q} variables the variables to be used
     * @param {any} options to be passed onto the underlying implementation
     * @returns {Promise<T>}
     */
    executeMutation<T, Q>(mutation: string, variables?: Q, options?: any): Promise<any>;
}
