import { Stream } from "stream";
import { RepoRef } from "../operations/common/RepoId";
import { File } from "./File";

/**
 * Project operations common to all projects
 */
export interface ProjectCore {

    readonly name: string;

    id: RepoRef;

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
     * include all files. If at least one positive pattern is provided,
     * one or more negative glob patterns can be provided.
     */
    streamFiles(...globPatterns: string[]): FileStream;

    /**
     * Stream file with full control over globs.
     * At least one glob must be provided. No default exclusions will be used.
     * @param {string[]} globPatterns
     * @param opts for glob handling
     * @return {FileStream}
     */
    streamFilesRaw(globPatterns: string[], opts: {}): FileStream;

    /**
     * The total number of files in this project or directory
     *
     * @property {number} totalFileCount
     */
    totalFileCount(): Promise<number>;

    /**
     * Attempt to find a file.
     * Use then or catch, depending on whether the file exists.
     * You may well want getFile, which returns a Promise of the file or undefined.
     * @param {string} path
     * @return {Promise<File>}
     */
    findFile(path: string): Promise<File>;

    /**
     * Attempt to find a file.
     * Never throws an exception, returns undefined
     * @param {string} path
     * @return {Promise<File>}
     */
    getFile(path: string): Promise<File | undefined>;

    /**
     * Add a file preserving permissions
     * @param {File} f
     * @return {Promise<this>}
     */
    add(f: File): Promise<this>;

    addFile(path: string, content: string): Promise<this>;

    deleteFile(path: string): Promise<this>;

    /**
     * Move the file. Do not error if it's not found.
     * @param {string} oldPath
     * @param {string} newPath
     * @return {Promise<this>}
     */
    moveFile(oldPath: string, newPath: string): Promise<this>;

    /**
     * Add an empty directory to the project.
     * Should be preserved through all transformations, although
     * may not be accessible in some implementations
     * @param {string} path
     * @return {Promise<this>}
     */
    addDirectory(path: string): Promise<this>;

    /**
     * Delete a directory. Do not throw an error if it doesn't exist
     * @param {string} path
     * @return {Promise<this>}
     */
    deleteDirectory(path: string): Promise<this>;

    /**
     * Make a file executable by its owner.
     * Other permissions are unchanged.
     * @param {string} path
     * @return {Promise<this>}
     */
    makeExecutable(path: string): Promise<this>;

}

/**
 * Interface representing a project, allowing transparent operations
 * whether it is sourced from a GitHub or other repository, from local disk
 * or in memory. Allows both read and write operations. The three
 * interfaces it extends allow different styles of operation: scripting (deferred),
 * asynchronous (with promises) or synchronous.
 */
export interface Project extends ProjectAsync, ProjectSync {

    /**
     * For debugging: how was this project created?
     */
    provenance?: string;

}

export function isProject(a: any): a is Project {
    const p = a as Project;
    return !!p.findFile && !!p.findFileSync && !!p.moveFile;
}

/**
 * Extension of node Stream to handle files within a Project
 */
export interface FileStream extends Stream {

    on(event: "data" | "end" | "error", listener: (f: File) => void): this;

}
