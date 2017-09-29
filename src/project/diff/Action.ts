import {Changes} from "./Changes";

/**
 * Performs some side effect based on the compared fingerprints and diff
 * @param <F> fingerprint format
 * @param <D> diff format
 */
export interface Action<F, D extends Changes> {
    invoke(base: F, head: F, diff: D): void;
}
