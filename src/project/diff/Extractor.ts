import {ProjectAsync} from "../Project";

/**
 * Extracts the fingerprint from the project
 * @param <F> fingerprint format
 */

export interface Extractor<F> {
    extract(project: ProjectAsync): Promise<F>;
}
