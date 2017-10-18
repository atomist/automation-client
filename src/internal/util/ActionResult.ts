/**
 * Result of running an action, optionally on a target.
 * Instances may add further information.
 */
export interface ActionResult<T = undefined> {

    target: T;

    success: boolean;
}
