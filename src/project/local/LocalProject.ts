import { Project } from "../Project";

export function isLocalProject(p: Project): p is LocalProject {
    return (p as any).baseDir !== undefined;
}

/**
 * Implementation of Project backed by local file system
 */
export interface LocalProject extends Project {

    readonly baseDir: string;

}
