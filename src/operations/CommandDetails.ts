/**
 * Details common to commands created via functions
 */
import { RepoFinder } from "./common/repoFinder";
import { RepoLoader } from "./common/repoLoader";

export interface CommandDetails<PARAMS = any> {

    description: string;
    intent?: string | string[];
    tags?: string | string[];

    repoFinder?: RepoFinder;

    repoLoader?: (p: PARAMS) => RepoLoader;

}
