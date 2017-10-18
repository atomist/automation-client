
import { RepoId } from "../common/RepoId";

/**
 * Determine whether the given repo is eligible
 */
export type RepoFilter = (r: RepoId) => boolean | Promise<boolean>;

export const AllRepos: RepoFilter = r => true;
