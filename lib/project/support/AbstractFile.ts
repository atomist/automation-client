import * as _ from "lodash";
import { AbstractScriptedFlushable } from "../../internal/common/AbstractScriptedFlushable";
import { File } from "../File";

/**
 * Convenient support for all File implementations
 */
export abstract class AbstractFile extends AbstractScriptedFlushable<File> implements File {

    public abstract path: string;

    public readonly cache: Record<string, object> = {};

    get name(): string {
        return this.path.split("/").pop();
    }

    get extension(): string {
        return this.name.includes(".") ?
            this.name.split(".").pop() :
            "";
    }

    public abstract getContentSync(): string;

    public abstract setContentSync(content: string): this;

    public abstract getContent(encoding?: string): Promise<string>;

    public abstract getContentBuffer(): Promise<Buffer>;

    public abstract setContent(content: string): Promise<this>;

    public rename(name: string): Promise<this> {
        return this.setPath(this.path.replace(new RegExp(`${this.name}$`), name));
    }

    public abstract setPath(path: string): Promise<this>;

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

    public abstract isExecutable(): Promise<boolean>;

    public abstract isReadable(): Promise<boolean>;

    public abstract isBinary(): Promise<boolean>;

    protected invalidateCache(): this {
        _.keys(this.cache).forEach(k => delete this.cache[k]);
        return this;
    }
}
