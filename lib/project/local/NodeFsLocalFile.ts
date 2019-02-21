import * as fs from "fs-extra";
import { isBinaryFile } from "isbinaryfile";
import * as nodePath from "path";
import { logger } from "../../util/logger";
import { AbstractFile } from "../support/AbstractFile";
import { LocalFile } from "./LocalFile";

/**
 * Implementation of File interface on node file system
 */
export class NodeFsLocalFile extends AbstractFile implements LocalFile {

    constructor(public readonly baseDir: string, public path: string) {
        super();
        if (path.startsWith(nodePath.sep)) {
            this.path = path.substr(1);
        }
    }

    get realPath(): string {
        return realPath(this.baseDir, this.path);
    }

    public getContentSync(encoding: string = "utf8"): string {
        return fs.readFileSync(this.realPath).toString(encoding);
    }

    public getContent(encoding: string = "utf8"): Promise<string> {
        return this.getContentBuffer()
            .then(buf => buf.toString(encoding));
    }

    public getContentBuffer(): Promise<Buffer> {
        return fs.readFile(this.realPath);
    }

    public setContent(content: string): Promise<this> {
        return fs.writeFile(this.realPath, content)
            .then(_ => this);
    }

    public setContentSync(content: string): this {
        fs.writeFileSync(this.realPath, content);
        return this;
    }

    public setPath(path: string): Promise<this> {
        if (path !== this.path) {
            logger.debug(`setPath: from ${this.path} to ${path}: Unlinking ${this.realPath}`);
            const oldPath = this.realPath;
            this.path = path;
            return fs.move(oldPath, this.realPath).then(_ => this);
        }
        return Promise.resolve(this);
    }

    public isExecutable(): Promise<boolean> {
        return fs.access(this.realPath, fs.constants.X_OK).then(() => true).catch(_ => false);
    }

    public isReadable(): Promise<boolean> {
        return fs.access(this.realPath, fs.constants.R_OK).then(() => true).catch(_ => false);
    }

    public isBinary(): Promise<boolean> {
        return isBinaryFile(this.realPath);
    }
}

function realPath(baseDir: string, path: string): string {
    return baseDir + (path.startsWith("/") ? "" : "/") + path;
}
