
export interface LocalDirectory {
    baseDir: string;
}

export interface GitHost {
    url: "github.com";
}

export type VcsProvider = GitHost | LocalDirectory;

export function isLocalDirectory(p: VcsProvider): p is LocalDirectory {
    return (p as any).baseDir;
}

/**
 * Identifies a repo containing a potential Project.
 */
export interface RepoId {

    owner: string;

    repo: string;

    sha?: string;

    provider: VcsProvider;
}

export function isRepoId(r: any): r is RepoId {
    const maybeRi = r as RepoId;
    return !!maybeRi.owner && !!maybeRi.repo;
}

export class SimpleRepoId implements RepoId {

    constructor(public owner: string,
                public repo: string,
                public sha: string = "master",
                public provider: VcsProvider = { url: "github.com" }) {
    }
}
