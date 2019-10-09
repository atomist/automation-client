import {
    defer,
    ScriptedFlushable,
} from "../../internal/common/Flushable";
import { isPromise } from "../../internal/util/async";
import { toStringArray } from "../../internal/util/string";
import { File } from "../File";
import {
    FileStream,
    Project,
    ProjectAsync,
} from "../Project";

/**
 * Promise of an array of files. Usually sourced from Project.streamFiles
 */
export function toPromise(stream: FileStream): Promise<File[]> {
    return new Promise((resolve, reject) => {
        const files: File[] = [];
        stream
            .on("data", f => files.push(f))
            .on("error", reject)
            .on("end", _ => resolve(files));
    });
}

/**
 * Allows conveniently passing one or many glob patterns to utility functions
 */
export type GlobOptions = string | string[];

/**
 * Does at least one file matching the given predicate exist in this project?
 * If no predicate is supplied, does at least one file match the glob pattern?
 * No guarantees about ordering
 * @param p
 * @param globPatterns positive and negative globs to match
 * @param test return a boolean or promise. Defaults to true
 * @return {Promise<boolean>}
 */
export async function fileExists<T>(p: ProjectAsync,
                                    globPatterns: GlobOptions,
                                    test: (f: File) => (boolean | Promise<boolean>) = () => true): Promise<boolean> {
    return await countFiles(p, globPatterns, test) > 0;
}

/**
 * Count files matching the given predicate in this project
 * If no predicate is supplied, does at least one file match the glob pattern?
 * No guarantees about ordering
 * @param p
 * @param globPatterns positive and negative globs to match
 * @param test return a boolean or promise. Defaults to true
 * @return {Promise<boolean>}
 */
export async function countFiles<T>(p: ProjectAsync,
                                    globPatterns: GlobOptions,
                                    test: (f: File) => (boolean | Promise<boolean>) = () => true): Promise<number> {
    const results = await gatherFromFiles<boolean>(p,
        globPatterns,
        async f => await test(f) === true);
    return results.length;
}

/**
 * Gather values from files
 * @param {ProjectAsync} project to act on
 * @param {string} globPatterns glob pattern for files to match
 * @param {(f: File) => Promise<T>} gather function returning a promise (of the value you're gathering) from each file.
 * Undefined returns will be filtered out
 * @return {Promise<T[]>}
 */
export async function gatherFromFiles<T>(project: ProjectAsync,
                                         globPatterns: GlobOptions,
                                         gather: (f: File) => Promise<T> | undefined): Promise<T[]> {
    const allFiles = await project.getFiles(globPatterns);
    const matches = allFiles.map(gather);
    return (await Promise.all(matches)).filter(t => !!t);
}

/**
 * Async generator to iterate over files.
 * @param {Project} project to act on
 * @param {string} globPatterns glob pattern for files to match
 * @param filter function to determine whether this file should be included.
 * Include all files if this function isn't supplied.
 * @return {Promise<T[]>}
 */
export async function* fileIterator(project: Project,
                                    globPatterns: GlobOptions,
                                    filter: (f: File) => Promise<boolean> = async () => true): AsyncIterable<File> {
    const files = await project.getFiles(globPatterns);
    for (const file of files) {
        if (await filter(file)) {
            yield file;
        }
    }
}

/**
 * Perform the same operation on all the files.
 * @param project project to act on
 * @param globPatterns glob patterns to match
 * @param op operation to perform on files. Can return void or a promise.
 */
export async function doWithFiles<P extends ProjectAsync>(project: P,
                                                          globPatterns: GlobOptions,
                                                          op: (f: File) => void | Promise<any>): Promise<P> {
    const files = await project.getFiles(globPatterns);
    const filePromises: Array<Promise<File>> = [];
    files.map(f => {
        const r = op(f);
        if (isPromise(r)) {
            filePromises.push(r.then(_ => f.flush()));
        } else {
            if (f.dirty) {
                filePromises.push(f.flush());
            }
        }
    });
    await Promise.all(filePromises);
    return project;
}

/**
 * Delete files matching the glob pattern and extra test (if supplied)
 * @param project project to act on
 * @param globPatterns glob patterns for files to delete
 * @param test additional, optional test for files to be deleted
 */
export function deleteFiles<T>(project: ProjectAsync,
                               globPatterns: GlobOptions,
                               test: (f: File) => boolean = () => true): Promise<number> {
    const fp = project as any as ScriptedFlushable<any>;
    return new Promise((resolve, reject) => {
        let deleted = 0;
        project.streamFiles(...toStringArray(globPatterns))
            .on("data", f => {
                if (test(f)) {
                    ++deleted;
                    defer(fp, project.deleteFile(f.path));
                }
            })
            .on("error", reject)
            .on("end", () => {
                resolve(fp.flush()
                    .then(() => deleted));
            });
    });
}

/**
 * Copy files from one project to another
 * @param from project to copy files from
 * @param to project to copy files to
 */
export function copyFiles<P extends Project = Project>(from: Project, to: P): Promise<P> {
    return toPromise(from.streamFiles())
        .then(files =>
            Promise.all(
                files.map(f =>
                    f.getContent().then(content => to.addFile(f.path, content))),
            ),
    ).then(() => to);
}
