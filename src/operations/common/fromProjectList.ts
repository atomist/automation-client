import { Project } from "../../project/Project";
import { RepoFinder } from "./repoFinder";
import { RepoRef } from "./RepoId";
import { RepoLoader } from "./repoLoader";

export function fromListRepoFinder(projects: Project[]): RepoFinder {
    if (projects.some(p => !p.id)) {
        throw new Error("Not all projects have id");
    }
    return () => Promise.resolve(projects.map(p => p.id));
}

export function fromListRepoLoader(projects: Project[]): RepoLoader {
    if (projects.some(p => !p.id)) {
        throw new Error("Not all projects have id");
    }
    return (id: RepoRef) => Promise.resolve(projects.find(p => p.id === id));
}
