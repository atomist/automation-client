import { Options } from "micromatch";
import * as spigot from "stream-spigot";
import { RepoRef } from "../../operations/common/RepoId";
import {
    File,
    isFile,
} from "../File";
import {
    FileStream,
    Project,
} from "../Project";
import {
    AbstractProject,
    globMatchesWithin,
} from "../support/AbstractProject";
import { copyFiles } from "../util/projectUtils";
import { InMemoryFile } from "./InMemoryFile";

/**
 * In memory Project implementation. Primarily intended
 * for testing. BE WARNED: Does not correctly handle permissions and binary files!
 */
export class InMemoryProject extends AbstractProject {

    /**
     * Create a new InMemoryProject
     * @param id: RepoRef
     * @param files files to include in the project
     * @return {InMemoryProject}
     */
    public static from(id: RepoRef, ...files: Array<{ path: string, content: string } | File>): InMemoryProject {
        const inp = new InMemoryProject(id);
        files.forEach(f => inp.recordAddFile(f.path,
            isFile(f) ? f.getContentSync() : f.content));
        return inp;
    }

    /**
     * Create a new InMemoryProject without an id
     */
    public static of(...files: Array<{ path: string, content: string } | File>): InMemoryProject {
        return InMemoryProject.from({
            owner: "dummyOwner",
            repo: "dummyRepo",
            url: "https://fakeGitHub.com/dummyOwner/dummyRepo",
        }, ...files);
    }

    /**
     * Make an independent copy of the given project, with the same files
     * @param {Project} p
     * @return {InMemoryProject}
     */
    public static cache(p: Project): Promise<InMemoryProject> {
        const to = new InMemoryProject(p.id);
        return copyFiles(p, to);
    }

    /**
     * Directories added. May contain no files. Must
     * be included when copying to a file system.
     * @type {Array}
     */
    public readonly addedDirectoryPaths: string[] = [];

    private memFiles: InMemoryFile[] = [];

    constructor(xid?: RepoRef) {
        super(xid);
    }

    get fileCount(): number {
        return this.memFiles.length;
    }

    get filesSync(): File[] {
        return this.memFiles;
    }

    public findFile(path: string): Promise<File> {
        const file = this.findFileSync(path);
        return file ? Promise.resolve(file) : Promise.reject(new Error(`File not found at ${path}`));
    }

    public async getFile(path: string): Promise<File> {
        return this.memFiles.find(f => f.path === path);
    }

    public findFileSync(path: string): File {
        return this.memFiles.find(f => f.path === path);
    }

    public recordAddFile(path: string, content: string): this {
        this.invalidateCache();
        this.memFiles.push(new InMemoryFile(path, content));
        return this;
    }

    public addFileSync(path: string, content: string): void {
        this.recordAddFile(path, content);
    }

    public addFile(path: string, content: string): Promise<this> {
        this.addFileSync(path, content);
        return Promise.resolve(this);
    }

    public addDirectory(path: string): Promise<this> {
        this.invalidateCache();
        this.addedDirectoryPaths.push(path);
        return Promise.resolve(this);
    }

    public deleteDirectorySync(path: string): void {
        this.invalidateCache();
        this.memFiles.forEach(f => {
            if (f.path.startsWith(`${path}/`)) {
                this.deleteFileSync(f.path);
            }
        });
    }

    public deleteDirectory(path: string): Promise<this> {
        this.invalidateCache();
        this.deleteDirectorySync(path);
        return Promise.resolve(this);
    }

    public deleteFileSync(path: string): this {
        this.invalidateCache();
        this.memFiles = this.memFiles.filter(f => f.path !== path);
        return this;
    }

    public deleteFile(path: string): Promise<this> {
        this.deleteFileSync(path);
        return Promise.resolve(this);
    }

    public makeExecutableSync(path: string): void {
        throw new Error("unimplemented: makeExecutableSync");
    }

    public directoryExistsSync(path: string): boolean {
        return this.memFiles.some(f => f.path.startsWith(`${path}/`));
    }

    public async hasDirectory(path: string): Promise<boolean> {
        return Promise.resolve(this.directoryExistsSync(path));
    }

    public fileExistsSync(path: string): boolean {
        return this.memFiles.some(f => f.path === path);
    }

    public streamFilesRaw(globPatterns: string[], opts: Options): FileStream {
        const matchingFiles = globMatchesWithin(this.memFiles, globPatterns, opts);
        return spigot.array({ objectMode: true },
            matchingFiles,
        );
    }

    public makeExecutable(path: string): Promise<this> {
        return Promise.reject(new Error("makeExecutable not implemented"));
    }

}

export function isInMemoryProject(p: Project): p is InMemoryProject {
    const maybe = p as InMemoryProject;
    return maybe.addedDirectoryPaths !== undefined;
}
