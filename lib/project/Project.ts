import { Options } from "micromatch";
import { Stream } from "stream";
import { RepoRef } from "../operations/common/RepoId";
import { File } from "./File";
import { HasCache } from "./HasCache";

/**
 * Project operations common to all projects
 */
export interface ProjectCore extends HasCache {

    readonly name: string;

    id: RepoRef;

}

/**
 * Synchronous project operations. Should generally be avoided except for testing
 * or in other special cases.
 */
export interface ProjectSync extends ProjectCore {

    /**
     * Find a regular file with the given path. Return undefined if
     * file does not exist or is not a regular file.
     *
     * @param path {string} path to file relative to root of project
     * @returns {File}
     */
    findFileSync(path: string): File;

    /**
     * Add the given file to the project. Path can be nested. Content
     * is a literal string.  This method will throw an error if it is
     * not successful.
     *
     * @param path {string} path to file relative to root of project
     * @param content {string} The content to be placed in the new file
     */
    addFileSync(path: string, content: string): void;

    /**
     * Recursively deletes a directory and all its contents with the
     * given path.  Errors when deleting the directory are caught.
     *
     * @param path {string} path to directory relative to root of project
     */
    deleteDirectorySync(path: string): void;

    /**
     * Delete the given file from the project.  Path can be nested.
     * Errors when deleting the file are caught.
     *
     * @param path {string} path to file relative to root of project
     */
    deleteFileSync(path: string): void;

    /**
     * Makes a file executable.  Other permissions are unchanged.
     *
     * @param path {string} path to file relative to root of project
     */
    makeExecutableSync(path: string): void;

    /**
     * Does a directory with the given path exist?
     *
     * @param path {string} path to directory relative to root of project
     * @returns {boolean}
     */
    directoryExistsSync(path: string): boolean;

    /**
     * Does a regular file with the given path exist?  It will return
     * false if the file does not exist or is not a regular file.
     *
     * @param path {string} path to file relative to root of project
     * @returns {boolean}
     */
    fileExistsSync(path: string): boolean;

}

/**
 * Asynchronous Project operations, returning promises or node streams.
 */
export interface ProjectAsync extends ProjectCore {

    /**
     * Get files matching these patterns glob patterns.
     * @param {string[]} globPatterns. If none is supplied, return all files.
     * @return {Promise<File[]>}
     */
    getFiles(globPatterns?: string | string[]): Promise<File[]>;

    /**
     * Return a node stream of the files in the project meeting
     * the given path criteria. Uses default exclusions in the glob path.
     * @param globPatterns glob patterns. If none is provided,
     * include all files. If at least one positive pattern is provided,
     * one or more negative glob patterns can be provided.
     *
     * Prefer getFiles()
     *
     * @param {string[]} globPatterns glob patterns per micromatch
     * @return {FileStream}
     */
    streamFiles(...globPatterns: string[]): FileStream;

    /**
     * Stream file with full control over globs.  At least one glob
     * must be provided. No default exclusions will be used.
     *
     * @param {string[]} globPatterns glob patterns per micromatch
     * @param opts for glob handling
     * @return {FileStream}
     */
    streamFilesRaw(globPatterns: string[], opts: Options): FileStream;

    /**
     * The total number of files in this project or directory
     *
     * @return {number} totalFileCount
     */
    totalFileCount(): Promise<number>;

    /**
     * Attempt to find a regular file at path.  This method will
     * return a rejected Promise if the file does not exist or is not
     * a regular file.  You may well want getFile, which returns a
     * Promise of the file or undefined.
     *
     * @param {string} path path to file relative to root of project
     * @return {Promise<File>}
     */
    findFile(path: string): Promise<File>;

    /**
     * Attempt to find a regular file at path.  Never throws an
     * exception, returns undefined if file does not exist or is not a
     * regular file.
     *
     * @param {string} path path to file relative to root of project
     * @return {Promise<File>}
     */
    getFile(path: string): Promise<File | undefined>;

    /**
     * Does a regular file exist at this path?  It will return false
     * for non-existent files, directories, block devices, FIFOs,
     * sockets, etc.
     *
     * @param {string} path path to file relative to root of project
     * @return {Promise<boolean>}
     */
    hasFile(path: string): Promise<boolean>;

    /**
     * Does a directory exist at this path?  It will return false if
     * directory does not exist or if file at path is not a directory.
     *
     * @param {string} path path to directory relative to root of project
     * @return {Promise<boolean>}
     */
    hasDirectory(path: string): Promise<boolean>;

    /**
     * Add a file preserving permissions
     * @param {File} f
     * @return {Promise<this>}
     */
    add(f: File): Promise<this>;

    /**
     * Add the given file to the project. Path can be nested. Content
     * is a literal string.
     *
     * @param path {string} path to file relative to root of project
     * @param content {string} The content to be placed in the new file
     */
    addFile(path: string, content: string): Promise<this>;

    /**
     * Delete the given file from the project.  Path can be nested.
     * Errors when deleting the file do not result in a rejected
     * Promise being returned.
     *
     * @param path {string} path to file relative to root of project
     */
    deleteFile(path: string): Promise<this>;

    /**
     * Move the file. Do not error if it's not found.
     * @param {string} oldPath
     * @param {string} newPath
     * @return {Promise<this>}
     */
    moveFile(oldPath: string, newPath: string): Promise<this>;

    /**
     * Add an empty directory to the project.  Should be preserved
     * through all transformations, although may not be accessible in
     * some implementations.
     *
     * @param {string} path path to directory relative to root of project
     * @return {Promise<this>}
     */
    addDirectory(path: string): Promise<this>;

    /**
     * Recursively delete a directory and all its contents.  Path can
     * be nested.  Errors when deleting the directory do not result in
     * a rejected Promise being returned.
     *
     * @param {string} path path to directory relative to root of project
     * @return {Promise<this>}
     */
    deleteDirectory(path: string): Promise<this>;

    /**
     * Make a file executable.  Other permissions are unchanged.
     *
     * @param {string} path path to file relative to root of project
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
