/**
 * Result of running an action, optionally on a target.
 * Instances may add further information beyond boolean success or failure.
 * Useful when promise chaining, to allow results to be included along with the target.
 */
export interface ActionResult<T = undefined> {

    /**
     * Target on which we ran the action, if there is one.
     */
    target: T;

    /**
     * Whether or not the action succeeded.
     */
    success: boolean;
}
