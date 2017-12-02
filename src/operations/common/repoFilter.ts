
import { RepoId } from "../common/RepoId";

/**
 * Determine whether the given repo is eligible
 */
export type RepoFilter = (r: RepoId) => boolean | Promise<boolean>;

export const AllRepos: RepoFilter = r => true;

export function andFilter(af: RepoFilter, bf: RepoFilter = () => true): RepoFilter {
    return r => Promise.resolve(af(r))
        .then(a => Promise.resolve(bf(r))
            .then(b => a && b));
}
