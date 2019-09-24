import { ScriptedFlushable } from "../internal/common/Flushable";
import { HasCache } from "./HasCache";

/**
 * Operations common to all File interfaces
 */
export interface FileCore extends HasCache {

    /**
     * Return file name, excluding path
     *
     * @property {string} name
     */
    readonly name: string;

    /**
     * Return file path, with forward slashes
     *
     * @property {string} path
     */
    readonly path: string;

}

/**
 * Convenient way to defer File operations with fluent API
 * @deprecated just remove it
 */
export interface FileScripting extends ScriptedFlushable<File> {

}

export interface FileAsync extends FileCore {

    setContent(content: string): Promise<this>;

    rename(name: string): Promise<this>;

    getContent(encoding?: string): Promise<string>;

    getContentBuffer(): Promise<Buffer>;

    replace(re: RegExp, replacement: string): Promise<this>;

    replaceAll(oldLiteral: string, newLiteral: string): Promise<this>;

    setPath(path: string): Promise<this>;

    isExecutable(): Promise<boolean>;

    isReadable(): Promise<boolean>;

    isBinary(): Promise<boolean>;

}

/* tslint:disable-next-line:deprecation */
export interface FileNonBlocking extends FileScripting, FileAsync {

}

/**
 * Sychronous file operations. Use with care as they can limit concurrency.
 * Following the conventions of node fs library, they use a "sync" suffix.
 */
export interface FileSync extends FileCore {

    /**
     * Return content. Blocks: use inputStream by preference.
     *
     * @property {string} content
     */
    getContentSync(encoding?: string): string;

    setContentSync(content: string): this;

}

/**
 * Abstraction for a File. Similar to Project abstraction,
 * broken into three distinct styles of usage.
 */
/* tslint:disable-next-line:deprecation */
export interface File extends FileScripting, FileSync, FileAsync {

    /**
     * Extension or the empty string if no extension can be determined
     */
    extension: string;

}

export function isFile(a: any): a is File {
    const maybeF = a as File;
    return !!maybeF.name && !!maybeF.path && !!maybeF.getContentSync;
}
