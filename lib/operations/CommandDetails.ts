import { RepoFinder } from "./common/repoFinder";
import { RepoLoader } from "./common/repoLoader";

/**
 * Details common to commands created via functions
 */
export interface CommandDetails<PARAMS = any> {

    description: string;
    intent?: string | string[] | RegExp;
    tags?: string | string[];
    autoSubmit?: boolean;

    repoFinder?: RepoFinder;

    repoLoader?: (p: PARAMS) => RepoLoader;

}
