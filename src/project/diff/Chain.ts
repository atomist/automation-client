import {Action} from "./Action";
import {Changes} from "./Changes";
import {Differ} from "./Differ";
import {Extractor} from "./Extractor";

/**
 * Chain an Extractor, Differ, and Actions together so that this common flow can be expressed in a type safe way
 * @param <F> fingerprint format
 * @param <D> diff format
 */
export interface Chain<F, D extends Changes> {

    extractor: Extractor<F>;

    differ: Differ<F, D>;

    actions: Array<Action<F, D>>;
}
