import { File } from "../File";
import { FileStream, Project } from "../Project";

import * as fs from "fs-extra";
import * as fpath from "path";

import * as gs from "glob-stream";
import * as stream from "stream";
import { promisify } from "util";
import { deleteFolderRecursive } from "../../internal/util/file";
import { logger } from "../../internal/util/logger";
import { RepoRef, SimpleRepoId } from "../../operations/common/RepoId";
import { AbstractProject } from "../support/AbstractProject";
import { toPromise } from "../util/projectUtils";
import { isLocalProject, LocalProject } from "./LocalProject";
import { NodeFsLocalFile } from "./NodeFsLocalFile";

/**
 * Implementation of LocalProject based on node file system.
 * Uses fs-extra vs raw fs.
 */
export class NodeFsLocalProject extends AbstractProject implements LocalProject {

    /**
     * Create a project from an existing directory. The directory must exist
     * @param {RepoRef} id
     * @param {string} baseDir
     * @return {Promise<LocalProject>}
     */
    public static fromExistingDirectory(id: RepoRef, baseDir: string): Promise<LocalProject> {
        return fs.stat(baseDir).then(stat => {
            if (!stat.isDirectory()) {
                throw new Error(`No such directory: [${baseDir}] when trying to create LocalProject`);
            } else {
                return new NodeFsLocalProject(id, baseDir);
        }});
    }

    /**
     * Copy the contents of the other project to this project
     * @param {Project} other
     * @param {string} parentDir
     * @param newName new name of the project. Defaults to name of old project
     * @returns {LocalProject}
     */
    public static copy(other: Project, parentDir: string, newName: string = other.name): Promise<LocalProject> {
        const baseDir = parentDir + "/" + newName;
        if (!fs.existsSync(baseDir)) {
            fs.mkdirSync(baseDir);
        }
        if (isLocalProject(other)) {
            return fs.copy(other.baseDir, baseDir)
                .then(_ =>
                    new NodeFsLocalProject(other.id, baseDir));
        } else {
            // We don't know what kind of project the other one is,
            // so we are going to need to copy the files one at a time
            const p = new NodeFsLocalProject(other.id, baseDir);
            return toPromise(other.streamFiles())
                .then(files =>
                    Promise.all(
                        files.map(f =>
                            f.getContent().then(content => p.addFile(f.path, content))),
                    ),
                ).then(() => p);
        }
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
     */
    public constructor(ident: RepoRef | string, baseDir: string) {
        super(typeof ident === "string" ? new SimpleRepoId(undefined, ident) : ident);
        // TODO not sure why app-root-path can return something weird and this coercion is necessary
        this.baseDir = "" + baseDir;
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
            .then(() => fs.writeFile(realName, content)).then(() => this);
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
                return fs.chmod(this.toRealPath(path), stats.mode && fs.constants.S_IXUSR);
            } )
            .then(_ => this);
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
                Promise.reject(`File not found at ${path}`),
            );
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
