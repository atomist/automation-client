import { ScriptedFlushable } from "./Flushable";

/**
 * Operations common to all File interfaces
 */
export interface FileCore {

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

export interface FileScripting extends ScriptedFlushable<File> {

    /**
     * Set entire file content to new string
     *
     * @param newContent {string} The content to set the file to
     */
    recordSetContent(newContent: string): this;

    recordRename(name: string): this;

    recordSetPath(name: string): this;

    /**
     * Replace all occurrences of the given regular expression with
     * @param re
     * @param replacement
     */
    recordReplace(re: RegExp, replacement: string): this;

    recordReplaceAll(oldLiteral: string, newLiteral: string): this;

}

export interface FileAsync extends FileCore {

    setContent(content: string): Promise<this>;

    getContent(): Promise<string>;

}

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
    getContentSync(): string;

    setContentSync(content: string): this;

}

/**
 * Abstraction for a File. Similar to Project abstraction,
 * broken into three distinct styles of usage.
 */
export interface File extends FileScripting, FileSync, FileAsync {

    /**
     * Return the file's permissions
     *
     * @property {number} permissions
     */
    readonly permissions: number;

}
