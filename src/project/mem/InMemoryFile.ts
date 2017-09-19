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

    get permissions(): number {
        throw new Error("permissions not implemented");
    }

    public recordSetContent(newContent: string): this {
        return this.setContentSync(newContent);
    }

    public getContentSync(): string {
        return this.content;
    }

    public setContentSync(content: string): this {
        this.content = content;
        return this;
    }

    public getContent(): Promise<string> {
        return Promise.resolve(this.getContentSync());
    }

    public recordSetPath(path: string): this {
        this.path = path;
        return this;
    }

    get dirty(): boolean {
        return this.initialContent !== this.getContentSync() || this.initialPath !== this.path;
    }

}
