import { Changes } from "./Changes";

/**
 * Diffs two fingerprints
 * @param <F> fingerprint format
 * @param <D> diff format
 */
export interface Differ<F, D extends Changes> {
    diff(base: F, head: F): D;
}
