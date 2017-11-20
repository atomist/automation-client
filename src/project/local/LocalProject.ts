import { Project } from "../Project";

/**
 * Implementation of LocalProject based on node file system.
 * Uses fs-extra vs raw fs.
 */
export type ReleaseFunction = () => Promise<void>;

export function isLocalProject(p: Project): p is LocalProject {
    return (p as any).baseDir !== undefined;
}

/**
 * Implementation of Project backed by local file system
 */
export interface LocalProject extends Project {

    readonly baseDir: string;

    /**
     * Release any locks held
     */
    release: ReleaseFunction;

}
