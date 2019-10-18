import { Options } from "fast-glob";
import * as micromatch from "micromatch";
import { AbstractScriptedFlushable } from "../../internal/common/AbstractScriptedFlushable";
import { RepoRef } from "../../operations/common/RepoId";
import { logger } from "../../util/logger";
import {
    File,
    FileNonBlocking,
} from "../File";
import {
    DefaultExcludes,
    DefaultFiles,
} from "../fileGlobs";
import {
    FileStream,
    Project,
} from "../Project";
import { toPromise } from "../util/projectUtils";

/**
 * Support for implementations of Project interface
 */
export abstract class AbstractProject extends AbstractScriptedFlushable<Project> implements Project {

    /**
     * Cached paths
     */
    private cachedFiles: Promise<File[]> | undefined;

    public readonly cache: Record<string, object> = {};

    get name(): string {
        return !!this.id ? this.id.repo : undefined;
    }

    protected constructor(public id: RepoRef,
                          public shouldCache: boolean = false) {
        super();
    }

    /**
     * Return the file, or reject with error
     * @param {string} path
     * @return {Promise<File>}
     */
    public abstract findFile(path: string): Promise<File>;

    public abstract getFile(path: string): Promise<File | undefined>;

    public async hasFile(path: string): Promise<boolean> {
        return !!(await this.getFile(path));
    }

    public abstract hasDirectory(path: string): Promise<boolean>;

    public abstract findFileSync(path: string): File;

    public streamFiles(...globPatterns: string[]): FileStream {
        const globsToUse = globPatterns.length > 0 ? globPatterns.concat(DefaultExcludes) : DefaultFiles;
        return this.streamFilesRaw(globsToUse, { dot: true });
    }

    public abstract streamFilesRaw(globPatterns: string[], opts: Options): FileStream;

    /**
     * Get files matching these patterns
     * @param {string[]} globPatterns
     * @return {Promise<File[]>}
     */
    public async getFiles(globPatterns: string | string[] = []): Promise<File[]> {
        const globPatternsToUse = globPatterns ?
            (typeof globPatterns === "string" ? [globPatterns] : globPatterns) :
            [];
        // Deliberately checking truthiness of promise
        if (!this.cachedFiles || !this.shouldCache) {
            const globsToUse = [...DefaultFiles];
            this.cachedFiles = this.getFilesInternal(globsToUse);
        }
        return globMatchesWithin(await this.cachedFiles, globPatternsToUse, { dot: true });
    }

    /**
     * Subclasses can override this to optimize if they wish
     * @return {Promise<File[]>}
     */
    protected getFilesInternal(globPatterns: string[]): Promise<File[]> {
        return toPromise(this.streamFiles());
    }

    public async totalFileCount(): Promise<number> {
        const files = await this.getFiles();
        return files.length;
    }

    public trackFile(f: FileNonBlocking): this {
        logger.debug(`Project is tracking '${f.path}'`);
        return this.recordAction(p => {
            return f.flush().then(_ => p);
        });
    }

    public moveFile(oldPath: string, newPath: string): Promise<this> {
        return this.findFile(oldPath)
            .then(f =>
                f.setPath(newPath).then(() => this),
            )
            // Not an error if no such file
            .catch(err => this);
    }

    public abstract makeExecutable(path: string): Promise<this>;

    public recordAddFile(path: string, content: string): this {
        return this.recordAction(p => p.addFile(path, content));
    }

    public recordDeleteFile(path: string): this {
        return this.recordAction(p => p.deleteFile(path));
    }

    public abstract addFileSync(path: string, content: string): void;

    public abstract deleteDirectorySync(path: string): void;

    public abstract deleteDirectory(path: string): Promise<this>;

    // TODO set permissions
    public add(f: File): Promise<this> {
        return f.getContent()
            .then(content => this.addFile(f.path, content));
    }

    public abstract addFile(path: string, content: string): Promise<this>;

    public abstract addDirectory(path: string): Promise<this>;

    public abstract deleteFile(path: string): Promise<this>;

    public abstract deleteFileSync(path: string): void;

    public abstract makeExecutableSync(path: string): void;

    public abstract directoryExistsSync(path: string): boolean;

    public abstract fileExistsSync(path: string): boolean;

    protected invalidateCache(): void {
        this.cachedFiles = undefined;
    }

}

/**
 * Return the files that match these glob patterns, including negative globs
 */
export function globMatchesWithin(files: File[], globPatterns?: string[], opts?: micromatch.Options): File[] {
    if (!globPatterns || globPatterns.length === 0) {
        return files || [];
    }
    const paths = (files || []).map(f => f.path);

    const matchingPaths = micromatch(paths, globPatterns,  opts);
    return files.filter(f => matchingPaths.includes(f.path));
}
