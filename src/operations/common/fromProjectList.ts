import { Project } from "../../project/Project";
import { RepoFinder } from "./repoFinder";
import { RepoRef } from "./RepoId";
import { RepoLoader } from "./repoLoader";

export function fromListRepoFinder(projects: Project[]): RepoFinder {
    return () => Promise.resolve(projects.map(p => p.id));
}

export function fromListRepoLoader(projects: Project[]): RepoLoader {
    return (id: RepoRef) => Promise.resolve(projects.find(p => p.id === id));
}
