import { Project } from "../../project/Project";
import { RepoFinder } from "./repoFinder";
import { RepoId } from "./RepoId";
import { RepoLoader } from "./repoLoader";

export function fromListRepoFinder(projects: Project[]): RepoFinder {
    return () => Promise.resolve(projects.map(p => p.id));
}

export function fromListRepoLoader(projects: Project[]): RepoLoader {
    return (id: RepoId) => Promise.resolve(projects.find(p => p.id === id));
}
