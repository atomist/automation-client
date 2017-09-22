import { Stream } from "stream";
import { ScriptedFlushable } from "../internal/common/Flushable";
import { File, FileNonBlocking } from "./File";

/**
 * Project operations common to all projects
 */
export interface ProjectCore {

    readonly name: string;

}

/**
 * Deferrable project operations, which are recorded for later execution in
 * the flush() function.
 */
export interface ProjectScripting extends ProjectCore, ScriptedFlushable<Project> {

    /**
     * Add the given file to the project. Flush afterwards
     *
     * @param path {string} The path to use
     * @param content {string} The content to be placed in the new file
     */
    recordAddFile(path: string, content: string): this;

    recordDeleteFile(path: string): this;

    recordDeleteDirectory(path: string): this;

    /**
     * Track changes to the given file, flushing it when this
     * project flushes
     */
    trackFile(f: FileNonBlocking): this;

}

/**
 * Synchronous project operations. Should generally be avoided except for testing
 * or in other special cases.
 */
export interface ProjectSync extends ProjectCore {

    /**
     * Find file with the given path. Return undefined if not found.
     *
     * @param path {string} Path of the file we want
     * @returns {File}
     */
    findFileSync(path: string): File;

    /**
     * Add the given file to the project. Path can contain /s. Content is a literal string
     *
     * @param path {string} The path to use
     * @param content {string} The content to be placed in the new file
     */
    addFileSync(path: string, content: string): void;

    /**
     * Deletes a directory with the given path
     *
     * @param path {string} The path to use
     */
    deleteDirectorySync(path: string): void;

    /**
     * Delete the given file from the project. Path can contain /s.
     *
     * @param path {string} The path to use
     */
    deleteFileSync(path: string): void;

    /**
     * Makes a file executable
     *
     * @param path {string} The path to use
     */
    makeExecutableSync(path: string): void;

    /**
     * Does a directory with the given path exist?
     *
     * @param path {string} The path to use
     * @returns {boolean}
     */
    directoryExistsSync(path: string): boolean;

    /**
     * Does a file with the given path exist?
     *
     * @param path {string} The path to use
     * @returns {boolean}
     */
    fileExistsSync(path: string): boolean;

}

/**
 * Asynchronous Project operations, returning promises or node streams.
 */
export interface ProjectAsync extends ProjectCore {

    /**
     * Return a node stream of the files in the project meeting
     * the given path criteria. Uses default exclusions in the glob path.
     * @param globPatterns glob patterns. If none is provided,
     * included all files. If at least one positive pattern is provided,
     * one or more negative glob patterns can be provided.
     */
    streamFiles(...globPatterns: string[]): FileStream;

    /**
     * Stream file with full control over globs.
     * At least one glob must be provided. No default exclusions will be used.
     * @param {string[]} globPatterns
     * @return {FileStream}
     */
    streamFilesRaw(globPatterns: string[], opts: {}): FileStream;

    /**
     * The total number of files in this project or directory
     *
     * @property {number} totalFileCount
     */
    totalFileCount(): Promise<number>;

    addFile(path: string, content: string): Promise<this>;

    deleteFile(path: string): Promise<this>;

    deleteDirectory(path: string): Promise<this>;

}

/**
 * All non blocking project operations.
 */
export interface ProjectNonBlocking extends ProjectScripting, ProjectAsync {

}

/**
 * Interface representing a project, allowing transparent operations
 * whether it is sourced from a GitHub or other repository, from local disk
 * or in memory. Allows both read and write operations. The three
 * interfaces it extends allow different styles of operation: scripting (deferred),
 * asynchronous (with promises) or synchronous.
 */
export interface Project extends ProjectScripting, ProjectAsync, ProjectSync {

}

export interface FileStream extends Stream {

    on(event: "data" | "end" | "error", listener: (f: File) => void): this;

}
