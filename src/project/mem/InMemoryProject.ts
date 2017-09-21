import * as minimatch from "minimatch";
import * as spigot from "stream-spigot";

import { File } from "../File";
import { FileStream } from "../Project";
import { AbstractProject } from "../support/AbstractProject";
import { InMemoryFile } from "./InMemoryFile";

/**
 * In memory Project implementation. Mainly used for testing
 */
export class InMemoryProject extends AbstractProject {

    /**
     * Set name later if you need to. Defaults to
     * @param files files to include in the project
     * @return {InMemoryProject}
     */
    public static of(...files: Array<{ path: string, content: string}>): InMemoryProject {
        const inp = new InMemoryProject("in-memory-project");
        files.forEach(f => inp.recordAddFile(f.path, f.content));
        return inp;
    }

    private memFiles: InMemoryFile[] = [];

    constructor(public name: string) {
        super();
    }

    get fileCount() {
        return this.memFiles.length;
    }

    get filesSync(): File[] {
        return this.memFiles;
    }

    public findFileSync(path: string): File {
        return this.memFiles.find(f => f.path === path);
    }

    public recordAddFile(path: string, content: string): this {
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

    public deleteDirectorySync(path: string): void {
        for (const f of this.memFiles) {
            if (f.path.startsWith(path)) {
                this.recordDeleteFile(path);
            }
        }
    }

    public deleteDirectory(path: string): Promise<this> {
        // TODO should not be synch
        this.deleteDirectorySync(path);
        return Promise.resolve(this);
    }

    public deleteFileSync(path: string): this {
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
        return this.memFiles.some(f => f.path.startsWith(path));
    }

    public fileExistsSync(path: string): boolean {
        return this.memFiles.some(f => f.path === path);
    }

    public streamFilesRaw(globPatterns: string[]): FileStream {
        // TODO allow more than one glob pattern
        // if (globPatterns.length !== 0) {
        //     throw new Error("Only one glob pattern supported");
        // }
        const matchingPaths =
            minimatch.match(this.memFiles.map(f => f.path), globPatterns[0]);
        this.memFiles.map(f => matchingPaths.includes(f.path));
        return spigot.array({objectMode: true},
            this.memFiles.filter(f => matchingPaths.some(mp => mp === f.path)),
        );
    }

}
