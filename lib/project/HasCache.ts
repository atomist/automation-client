/**
 * Extended by types that can hold cached data.
 */
export interface HasCache {

    /**
     * Use to cache arbitrary content associated with this instance.
     * Use for smallish objects that are expensive to compute.
     * Be sure to use unique names. For example, do not store a property
     * named "ast" - also include the name of the parser used to build it.
     */
    readonly cache: Record<string, object>;
}

/**
 * Retrieve the value if stored in the cache. Otherwise compute with the given function
 * and store
 */
export async function retrieveOrCompute<T extends HasCache, R extends object>(t: T, key: string, how: (t: T) => R): Promise<R> {
    if (!t.cache[key]) {
        t.cache[key] = await how(t);
    }
    return t.cache[key] as R;
}
