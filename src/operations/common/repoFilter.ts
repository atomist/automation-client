
import { RepoId } from "../common/RepoId";

export type RepoFilter = (r: RepoId) => Promise<boolean>;

export const AllRepos: RepoFilter = r => Promise.resolve(true);
