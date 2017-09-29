/**
 * Behavior that is common to all diffs
 */
export interface Changes {
    /**
     * indication that the diff detected an actual change
     */
    hasChanged(): boolean;
}
