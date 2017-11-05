import { AbstractScriptedFlushable } from "../../internal/common/AbstractScriptedFlushable";
import { File } from "../File";

/**
 * Convenient support for all File implementations
 */
export abstract class AbstractFile extends AbstractScriptedFlushable<File> implements File {

    public abstract path: string;

    get name(): string {
        return this.path.split("/").pop();
    }

    public abstract getContentSync(): string;

    public abstract setContentSync(content: string): this;

    public abstract getContent(): Promise<string>;

    public abstract setContent(content: string): Promise<this>;

    public recordSetContent(newContent: string): this {
        return this.recordAction(f => f.setContent(newContent));
    }

    public rename(name: string): Promise<this> {
        return this.setPath(this.path.replace(new RegExp(`${this.name}$`), name));
    }

    public recordRename(name: string): this {
        return this.recordSetPath(this.path.replace(new RegExp(`${this.name}$`), name));
    }

    public abstract setPath(path: string): Promise<this>;

    public recordSetPath(path: string): this {
        return this.recordAction(f => f.setPath(path));
    }

    public replace(re: RegExp, replacement: string): Promise<this> {
        return this.getContent()
            .then(content =>
                this.setContent(content.replace(re, replacement)),
            );
    }

    public replaceAll(oldLiteral: string, newLiteral: string): Promise<this> {
        return this.getContent()
            .then(content =>
                this.setContent(content.split(oldLiteral).join(newLiteral)),
            );
    }

    public recordReplace(re: RegExp, replacement: string): this {
        return this.recordAction(f => f.replace(re, replacement));
    }

    public recordReplaceAll(oldLiteral: string, newLiteral: string): this {
        return this.recordAction(f => f.replaceAll(oldLiteral, newLiteral));
    }

    public isExecutable(): Promise<boolean> {
        throw new Error("isExecutable not implemented.");
    }

}
