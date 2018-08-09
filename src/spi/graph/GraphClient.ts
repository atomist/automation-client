/**
 * Client for GraphQL operations. Provided to all handlers.
 */
export interface GraphClient {

    /**
     * GraphQL endpoint
     */
    endpoint: string;

    /**
     * Run query either provided as a string or as loaded from a file
     * @param {QueryOptions<Q> | string} optionsOrName
     * @returns {Promise<T>}
     */
    query<T, Q>(optionsOrName: QueryOptions<Q> | string): Promise<T>;

    /**
     * Run mutation either provided as a string or as loaded from a file
     * @param {MutationOptions<Q> | string} optionsOrName
     * @returns {Promise<T>}
     */
    mutate<T, Q>(optionsOrName: MutationOptions<Q> | string): Promise<T>;

    /**
     * Run GraphQL query based on the provided file name and variables
     * @param {string} path the relative path from module root to the graphql file
     * @param {Q} variables the variables to be used
     * @param {any} options to be passed onto the underlying implementation
     * @param {string} current the path to the calling script
     * @returns {Promise<T>}
     * @deprecated use query() instead
     */
    executeQueryFromFile<T, Q>(path: string, variables?: Q, options?: any, current?: string): Promise<T>;

    /**
     * Run GraphQL query based on the provide query and variables
     * @param {string} query the graphql mutation as string
     * @param {Q} variables the variables to be used
     * @param {any} options to be passed onto the underlying implementation
     * @returns {Promise<T>}
     * @deprecated use query() instead
     */
    executeQuery<T, Q>(query: string, variables?: Q, options?: any): Promise<T>;

    /**
     * Run GraphQL mutation based on the provided file name and variables
     * @param {string} path the relative path from module root to the graphql file
     * @param {Q} variables the variables to be used
     * @param {any} options to be passed onto the underlying implementation
     * @param {string} current the path to the calling script
     * @returns {Promise<T>}
     * @deprecated use mutate() instead
     */
    executeMutationFromFile<T, Q>(path: string, variables?: Q, options?: any, current?: string): Promise<T>;

    /**
     * Run GraphQL mutation based on the provided mutation name and variables
     * @param {string} mutation the graphql mutation as string
     * @param {Q} variables the variables to be used
     * @param {any} options to be passed onto the underlying implementation
     * @returns {Promise<T>}
     * @deprecated use mutate() instead
     */
    executeMutation<T, Q>(mutation: string, variables?: Q, options?: any): Promise<T>;
}

/**
 * Options to be passed into GraphClient.query.
 * Note: either query, name or path needs to be provided.
 */
export interface QueryOptions<Q> {

    /** Optional GraphQL query string */
    query?: string;
    /**
     * Optional absolute or relative path to the '.graphql' query file.
     * Relative paths will get resolved against the path of the calling script.
     */
    path?: string;
    /**
     * Optional name of the query operation in a '.graphql' file located in 'graphql/query'.
     * The file system will be searched upwards for a 'graphql' folder; starting in
     * the directory of the currently executing script.
     */
    name?: string;
    /** Optional directory containing GraphQL fragments; defaults to 'graphql/fragment' */
    fragmentDir?: string;
    /** Optional variables passed to the GraphQL query */
    variables?: Q;
    /** Optional options passed to the underlying implementation */
    options?: any;
}

/**
 * Options to be passed to GraphClient.mutate.
 * Note: either mutation, name or path needs to be provided.
 */
export interface MutationOptions<Q> {

    /** Optional GraphQL mutation string */
    mutation?: string;
    /**
     * Optional absolute or relative path to the '.graphql' query file.
     * Relative paths will get resolved against the path of the calling script.
     */
    path?: string;
    /**
     * Optional name of the mutation operation in a '.graphql' file located in 'graphql/mutation'.
     * The file system will be searched upwards for a 'graphql' folder; starting in
     * the directory of the currently executing script.
     */
    name?: string;
    /** Optional variables passed to the GraphQL mutation */
    variables?: Q;
    /** Optional options passed to the underlying implementation */
    options?: any;
}

/** Query options to prevent caching */
export const QueryNoCacheOptions = { fetchPolicy: "network-only" };

/** Mutation options to prevent caching */
export const MutationNoCacheOptions = { fetchPolicy: "no-cache" };
