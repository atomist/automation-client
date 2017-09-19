import * as fpath from "path";

import * as fs from "fs-extra";
import { InMemoryFile } from "../mem/InMemoryFile";
import { AbstractFile } from "../support/AbstractFile";
import { LocalFile } from "./LocalFile";

/**
 * Implementation of File interface on node file system
 */
export class NodeFsLocalFile extends AbstractFile implements LocalFile {

    private inMemoryFile: InMemoryFile;

    private isDirty = false;

    constructor(public readonly baseDir: string, readonly initialPath: string) {
        super();
    }

    get realPath(): string {
        return realPath(this.baseDir, this.path);
    }

    get path(): string {
        return !!this.inMemoryFile ?
            this.inMemoryFile.path :
            this.initialPath;
    }

    public getContentSync(): string {
        if (!!this.inMemoryFile) {
            return this.inMemoryFile.content;
        }
        const buf = fs.readFileSync(this.realPath);
        const content = buf.toString();
        this.inMemoryFile = new InMemoryFile(this.path, content);
        return content;
    }

    public getContent(): Promise<string> {
        if (!!this.inMemoryFile) {
            return Promise.resolve(this.inMemoryFile.content);
        }
        return fs.readFile(this.realPath)
            .then(buf => buf.toString());
    }

    get permissions(): number {
        throw new Error("not yet implemented");
    }

    public recordSetContent(newContent: string): this {
        if (!this.inMemoryFile) {
            this.inMemoryFile = new InMemoryFile(this.path, newContent);
        }
        this.inMemoryFile.recordSetContent(newContent);
        return this;
    }

    public setContentSync(content: string): this {
        if (!this.inMemoryFile) {
            this.inMemoryFile = new InMemoryFile(this.path, content);
        }
        fs.writeFileSync(this.realPath, content);
        return this;
    }

    public recordSetPath(newPath: string): this {
        if (!this.inMemoryFile) {
            this.inMemoryFile = new InMemoryFile(this.path, this.getContentSync());
        }
        this.inMemoryFile.recordSetPath(newPath);
        return this;
    }

    get dirty(): boolean {
        return this.isDirty || !!this.inMemoryFile && this.inMemoryFile.dirty;
    }

    public flush(): Promise<this> {
        if (this.dirty) {
            // Write out the in memory file content
            if (this.inMemoryFile.path !== this.initialPath) {
                fs.unlinkSync(realPath(this.baseDir, this.initialPath));
            }
            // TODO make this not synch, return promise
            const dir = fpath.dirname(this.realPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirsSync(dir);
            }
            fs.writeFileSync(this.realPath, this.getContentSync());
            this.inMemoryFile = undefined;
            this.isDirty = false;
            // TODO this is a hack. Super should handle this.
            return super.flush();
        } else {
            // Nothing to do
            return super.flush();
        }
    }
}

function realPath(baseDir: string, path: string): string {
    return baseDir + (path.startsWith("/") ? "" : "/") + path;
}
