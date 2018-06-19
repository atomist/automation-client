import * as fs from "fs-extra";
import * as gs from "glob-stream";
import * as fpath from "path";
import * as stream from "stream";
import { deleteFolderRecursive } from "../../internal/util/file";
import { logger } from "../../internal/util/logger";
import {
    RepoRef,
    SimpleRepoId,
} from "../../operations/common/RepoId";
import { File } from "../File";
import { isInMemoryProject } from "../mem/InMemoryProject";
import {
    FileStream,
    Project,
} from "../Project";
import { AbstractProject } from "../support/AbstractProject";
import { copyFiles } from "../support/projectUtils";
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
     * @param newName new name of the project. Defaults to name of old project
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
    public constructor(ident: RepoRef | string, baseDir: string,
                       private cleanup: ReleaseFunction = () => Promise.resolve()) {
        super(typeof ident === "string" ? new SimpleRepoId(undefined, ident) : ident);
        // TODO not sure why app-root-path can return something weird and this coercion is necessary
        this.baseDir = "" + baseDir;
    }

    public release(): Promise<void> {
        return this.cleanup();
    }

    public addFileSync(path: string, content: string): void {
        const realName = this.baseDir + "/" + path;
        const dir = fpath.dirname(realName);
        if (!fs.existsSync(dir)) {
            fs.mkdirsSync(dir);
        }
        fs.writeFileSync(realName, content);
    }

    public addFile(path: string, content: string): Promise<this> {
        const realName = this.baseDir + "/" + path;
        const dir = fpath.dirname(realName);
        return fs.pathExists(dir).then(exists => exists ? Promise.resolve() : fs.mkdirs(dir))
            .then(() => fs.writeFile(realName, content))
            .then(() => this);
    }

    public addDirectory(path: string): Promise<this> {
        const realName = this.baseDir + "/" + path;
        return fs.mkdirp(realName)
            .then(() => this);
    }

    public deleteDirectory(path: string): Promise<this> {
        return fs.remove(this.toRealPath(path))
            .then(_ => this)
            .catch(err => {
                logger.warn("Unable to delete directory '%s': %s", path, err);
                return this;
            });
    }

    public deleteDirectorySync(path: string): void {
        const localPath = this.toRealPath(path);
        try {
            deleteFolderRecursive(localPath);
            fs.unlinkSync(localPath);
        } catch (e) {
            logger.warn("Ignoring directory deletion error: " + e);
        }
    }

    public deleteFileSync(path: string): void {
        try {
            fs.unlinkSync(this.toRealPath(path));
        } catch (e) {
            logger.warn("Ignoring file deletion error: " + e);
        }
    }

    public deleteFile(path: string): Promise<this> {
        return fs.unlink(this.toRealPath(path)).then(_ => this);
    }

    public makeExecutable(path: string): Promise<this> {
        return fs.stat(this.toRealPath(path))
            .then(stats => {
                logger.debug("Starting mode: " + stats.mode);
                // tslint:disable-next-line:no-bitwise
                const newMode = stats.mode | fs.constants.S_IXUSR;
                logger.debug("Setting mode to: " + newMode);
                return fs.chmod(this.toRealPath(path), newMode);
            })
            .then(() => this);
    }

    public makeExecutableSync(path: string): void {
        throw new Error("makeExecutableSync not implemented.");
    }

    public directoryExistsSync(path: string): boolean {
        throw new Error("directoryExistsSync not implemented.");
    }

    public fileExistsSync(path: string): boolean {
        return fs.existsSync(this.baseDir + "/" + path);
    }

    public findFile(path: string): Promise<File> {
        return fs.pathExists(this.baseDir + "/" + path)
            .then(exists => exists ?
                Promise.resolve(new NodeFsLocalFile(this.baseDir, path)) :
                Promise.reject(fileNotFound(path)),
            );
    }

    public async getFile(path: string): Promise<File> {
        const exists = await fs.pathExists(this.baseDir + "/" + path);
        return exists ? new NodeFsLocalFile(this.baseDir, path) :
            undefined;
    }

    public findFileSync(path: string): File {
        if (!this.fileExistsSync(path)) {
            return undefined;
        }
        return new NodeFsLocalFile(this.baseDir, path);
    }

    public streamFilesRaw(globPatterns: string[], opts: {}): FileStream {
        // Fight arrow function "this" issue
        const baseDir = this.baseDir;
        const toFileTransform = new stream.Transform({objectMode: true});

        toFileTransform._transform = function(chunk, encoding, done) {
            const f = new NodeFsLocalFile(baseDir, pathWithinArchive(baseDir, chunk.path));
            this.push(f);
            done();
        };

        const optsToUse = {
            // We can override these defaults...
            nodir: true,
            allowEmpty: true,
            ...opts,
            // ...but we force this one
            cwd: this.baseDir,
        };
        return gs(globPatterns, optsToUse)
            .pipe(toFileTransform);
    }

    private toRealPath(path: string): string {
        return this.baseDir + "/" + path;
    }

}

function pathWithinArchive(baseDir: string, rawPath: string): string {
    return rawPath.substr(baseDir.length);
}

// construct a useful exception
function fileNotFound(path: string): Error {
    const error = new Error(`File not found at ${path}`);
    (error as any).code = "ENOENT";
    return error;
}
