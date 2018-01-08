import { RemoteRepoRef } from "../RepoId";

/**
 * Implemented by classes that know how to identify a remote repo
 */
export interface RemoteLocator {

    /**
     * Return a single RepoRef or undefined if it's not possible
     * @return {RepoRef}
     */
    repoRef: RemoteRepoRef;
}
