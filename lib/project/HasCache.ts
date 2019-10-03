export interface HasCache {

    /**
     * Use to cache arbitrary content associated with this instance.
     * Use for smallish objects that are expensive to compute.
     */
    readonly cache: Record<string, object>;
}

/**
 * Retrieve the value if stored in the cache. Otherwise compute with the given function
 * and store
 */
export async function retrieveOrCompute<T extends HasCache, R extends object>(t: T,
                                                                              key: string,
                                                                              how: (t: T) => R,
                                                                              cache: boolean = true): Promise<R> {
    if (!cache) {
        return how(t);
    }
    if (!t.cache[key]) {
        t.cache[key] = how(t);
    }
    return t.cache[key] as R;
}
