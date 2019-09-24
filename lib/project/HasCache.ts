
export interface HasCache {

    /**
     * Use to cache arbitrary content associated with this instance.
     * Use for smallish objects that are expensive to compute.
     */
    readonly cache: Record<string, object>;
}