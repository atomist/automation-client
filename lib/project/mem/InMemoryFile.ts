import { AbstractFile } from "../support/AbstractFile";

/**
 * In memory File implementation. Useful in testing
 * and to back quasi-synchronous operations. Do not use
 * for very large files.
 */
export class InMemoryFile extends AbstractFile {

    private readonly initialPath: string;
    private readonly initialContent: string;

    constructor(public path: string, public content: string) {
        super();
        this.initialPath = path;
        this.initialContent = content;
    }

    public getContentSync(): string {
        return this.content;
    }

    public setContentSync(content: string): this {
        this.content = content;
        return this;
    }

    public setContent(content: string): Promise<this> {
        return Promise.resolve(this.setContentSync(content));
    }

    public getContent(): Promise<string> {
        return Promise.resolve(this.getContentSync());
    }

    public setPath(path: string): Promise<this> {
        this.path = path;
        return Promise.resolve(this);
    }

    get dirty(): boolean {
        return this.initialContent !== this.getContentSync() || this.initialPath !== this.path || super.dirty;
    }

    public isExecutable(): Promise<boolean> {
        throw new Error("isExecutable is not implemented here");
    }

    public isReadable(): Promise<boolean> {
        throw new Error("isReadable is not implemented here");
    }

    public isBinary(): Promise<boolean> {
        // InMemoryFile does not presently support binary files
        return Promise.resolve(false);
    }
}
