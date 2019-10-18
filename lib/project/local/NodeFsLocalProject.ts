import * as fg from "fast-glob";
import * as fs from "fs-extra";
import * as fpath from "path";
import * as stream from "stream";

import {
    RepoRef,
    SimpleRepoId,
} from "../../operations/common/RepoId";
import { logger } from "../../util/logger";
import { File } from "../File";
import { isInMemoryProject } from "../mem/InMemoryProject";
import {
    FileStream,
    Project,
} from "../Project";
import { AbstractProject } from "../support/AbstractProject";
import { copyFiles } from "../util/projectUtils";
import {
    isLocalProject,
    LocalProject,
    ReleaseFunction,
} from "./LocalProject";
import { NodeFsLocalFile } from "./NodeFsLocalFile";

export class NodeFsLocalProject extends AbstractProject implements LocalProject {

    /**
     * Create a project from an existing directory. The directory must exist
     * @param {RepoRef} id
     * @param {string} baseDir
     * @param cleanup
     * @return {Promise<LocalProject>}
     */
    public static fromExistingDirectory(id: RepoRef,
                                        baseDir: string,
                                        cleanup: ReleaseFunction = () => Promise.resolve()): Promise<LocalProject> {
        return fs.stat(baseDir).then(stat => {
            if (!stat.isDirectory()) {
                throw new Error(`No such directory: [${baseDir}] when trying to create LocalProject`);
            } else {
                return new NodeFsLocalProject(id, baseDir, cleanup);
            }
        });
    }

    /**
     * Copy the contents of the other project to this project
     * @param {Project} other
     * @param {string} baseDir
     * @param cleanup
     * @returns {LocalProject}
     */
    public static copy(other: Project,
                       baseDir: string,
                       cleanup: ReleaseFunction = () => Promise.resolve()): Promise<LocalProject> {

        return fs.ensureDir(baseDir)
            .then(() => {
                if (isLocalProject(other)) {
                    return fs.copy(other.baseDir, baseDir)
                        .then(() => new NodeFsLocalProject(other.id, baseDir, cleanup));
                } else {
                    // We don't know what kind of project the other one is,
                    // so we are going to need to copy the files one at a time
                    const p = new NodeFsLocalProject(other.id, baseDir, cleanup);
                    return copyFiles(other, p)
                        .then(() => {
                            // Add empty directories if necessary
                            let prom = Promise.resolve(p);
                            if (isInMemoryProject(other)) {
                                other.addedDirectoryPaths.forEach(path => {
                                    prom = prom.then(() => p.addDirectory(path));
                                });
                            }
                            return prom;
                        });
                }
            });
    }

    /**
     * Base directory of the project on the local file system
     */
    public readonly baseDir: string;

    /**
     * Note: this does not validate existence of the target
     * directory, so using it except in tests should be avoided
     * @param {RepoRef} ident identification of the repo
     * @param {string} baseDir
     * @param cleanup function that will release locks, delete temp directories etc
     */
    public constructor(ident: RepoRef | string,
                       baseDir: string,
                       private readonly cleanup: ReleaseFunction = () => Promise.resolve(),
                       shouldCache: boolean = false) {
        super(typeof ident === "string" ? new SimpleRepoId(undefined, ident) : ident, shouldCache);
        // TODO not sure why app-root-path can return something weird and this coercion is necessary
        this.baseDir = "" + baseDir;
    }

    public release(): Promise<void> {
        return this.cleanup();
    }

    public addFileSync(path: string, content: string): void {
        this.invalidateCache();
        const realName = this.toRealPath(path);
        fs.outputFileSync(realName, content);
    }

    public async addFile(path: string, content: string): Promise<this> {
        this.invalidateCache();
        const realName = this.toRealPath(path);
        await fs.outputFile(realName, content);
        return this;
    }

    public async addDirectory(path: string): Promise<this> {
        this.invalidateCache();
        const realName = this.toRealPath(path);
        await fs.ensureDir(realName);
        return this;
    }

    public async deleteDirectory(path: string): Promise<this> {
        try {
            await fs.remove(this.toRealPath(path));
            this.invalidateCache();
        } catch (e) {
            logger.debug("Unable to delete directory '%s': %s", path, e.message);
        }
        return this;
    }

    public deleteDirectorySync(path: string): void {
        const localPath = this.toRealPath(path);
        try {
            fs.removeSync(localPath);
            this.invalidateCache();
        } catch (e) {
            logger.debug("Unable to delete directory '%s': %s", path, e.message);
        }
    }

    public deleteFileSync(path: string): void {
        try {
            fs.unlinkSync(this.toRealPath(path));
            this.invalidateCache();
        } catch (e) {
            logger.debug("Unable to delete file '%s': %s", path, e.message);
        }
    }

    public async deleteFile(path: string): Promise<this> {
        try {
            await fs.unlink(this.toRealPath(path));
            this.invalidateCache();
        } catch (e) {
            logger.debug("Unable to delete file '%s': %s", path, e.message);
        }
        return this;
    }

    public async makeExecutable(path: string): Promise<this> {
        const stat = await fs.stat(this.toRealPath(path));
        // tslint:disable-next-line:no-bitwise
        const newMode = stat.mode | fs.constants.S_IXUSR | fs.constants.S_IXGRP | fs.constants.S_IXOTH;
        await fs.chmod(this.toRealPath(path), newMode);
        return this;
    }

    public makeExecutableSync(path: string): void {
        const stat = fs.statSync(this.toRealPath(path));
        // tslint:disable-next-line:no-bitwise
        const newMode = stat.mode | fs.constants.S_IXUSR | fs.constants.S_IXGRP | fs.constants.S_IXOTH;
        fs.chmodSync(this.toRealPath(path), newMode);
    }

    public directoryExistsSync(path: string): boolean {
        try {
            const stat = fs.statSync(this.toRealPath(path));
            return stat.isDirectory();
        } catch (e) {
            return false;
        }
    }

    public async hasDirectory(path: string): Promise<boolean> {
        try {
            const stat = await fs.stat(this.toRealPath(path));
            return stat.isDirectory();
        } catch (e) {
            return false;
        }
    }

    public fileExistsSync(path: string): boolean {
        try {
            const stat = fs.statSync(this.toRealPath(path));
            return stat.isFile();
        } catch (e) {
            return false;
        }
    }

    public async findFile(path: string): Promise<File> {
        let stat: fs.Stats;
        try {
            stat = await fs.stat(this.toRealPath(path));
        } catch (e) {
            throw fileNotFound(path);
        }
        if (!stat.isFile()) {
            throw new Error(`Path ${path} is not a regular file`);
        }
        return new NodeFsLocalFile(this.baseDir, path);
    }

    public async getFile(path: string): Promise<File> {
        try {
            const stat = await fs.stat(this.toRealPath(path));
            return stat.isFile() ? new NodeFsLocalFile(this.baseDir, path) : undefined;
        } catch (e) {
            return undefined;
        }
    }

    public findFileSync(path: string): File {
        try {
            const stat = fs.statSync(this.toRealPath(path));
            return stat.isFile() ? new NodeFsLocalFile(this.baseDir, path) : undefined;
        } catch (e) {
            return undefined;
        }
    }

    protected async getFilesInternal(globPatterns: string[]): Promise<File[]> {
        const optsToUse: fg.Options = {
            onlyFiles: true,
            dot: true,
            cwd: this.baseDir,
        };
        const paths = await fg(globPatterns, optsToUse);
        const files = paths.map(path => new NodeFsLocalFile(this.baseDir, path));
        return files;
    }

    public streamFilesRaw(globPatterns: string[], opts: fg.Options): FileStream {
        // Fight arrow function "this" issue
        const baseDir = this.baseDir;
        const toFileTransform = new stream.Transform({ objectMode: true });

        toFileTransform._transform = function(chunk: any, encoding: string, done: (e?: any) => void): void {
            const f = new NodeFsLocalFile(baseDir, chunk);
            this.push(f);
            done();
        };

        const optsToUse: fg.Options = {
            // We can override these defaults...
            onlyFiles: true,
            ...opts,
            // ...but we force this one
            cwd: this.baseDir,
        };
        return fg.stream(globPatterns, optsToUse)
            .pipe(toFileTransform);
    }

    private toRealPath(path: string): string {
        return fpath.join(this.baseDir, path);
    }

}

// construct a useful exception
function fileNotFound(path: string): Error {
    const error = new Error(`File not found at ${path}`);
    (error as any).code = "ENOENT";
    return error;
}
