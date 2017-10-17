import { defer } from "../../internal/common/Flushable";
import { isPromise } from "../../internal/util/async";
import { File } from "../File";
import { FileStream, ProjectAsync } from "../Project";

/**
 * Promise of an array of files. Usually sourced from Project.streamFiles
 */
export function toPromise(stream: FileStream): Promise<File[]> {
    return new Promise((resolve, reject) => {
        const fils: File[] = [];
        stream
            .on("data", f => fils.push(f))
            .on("error", reject)
            .on("end", _ => resolve(fils));
    });
}

/**
 * Does at least one file matching the given predicate exist in this project?
 * No guarantees about ordering
 * @param p
 * @param globPattern
 * @param test
 * @return {Promise<boolean>}
 */
export function fileExists<T>(p: ProjectAsync,
                              globPattern: string,
                              test: (f: File) => boolean): Promise<boolean> {
    return saveFromFiles<boolean>(p, globPattern, f => test(f) === true)
        .then(results => results.length > 0);
}

/**
 * Gather data from a set of files
 * @param project project to act on
 * @param globPattern glob pattern for files to match
 * @param gather function that saves a value from a file or discards it
 * by returning undefined
 * @return {Promise<T>}
 */
export function saveFromFiles<T>(project: ProjectAsync,
                                 globPattern: string,
                                 gather: (f: File) => T | undefined): Promise<T[]> {
    return new Promise((resolve, reject) => {
        const gathered: T[] = [];
        project.streamFiles(globPattern)
            .on("data", f => {
                const g = gather(f);
                if (g) {
                    gathered.push(g);
                }
            })
            .on("error", reject)
            .on("end", _ => {
                resolve(gathered);
            });
    });
}

/**
 * Same as saveFromFiles, but works with promise returns
 * @param {ProjectAsync} project to act on
 * @param {string} globPattern glob pattern for files to match
 * @param {(f: File) => Promise<T>} gather function returning a promise from each file
 * @return {Promise<T[]>}
 */
export function saveFromFilesAsync<T>(project: ProjectAsync,
                                      globPattern: string,
                                      gather: (f: File) => Promise<T> | undefined): Promise<T[]> {
    return new Promise((resolve, reject) => {
        const gathered: Array<Promise<T>> = [];
        project.streamFiles(globPattern)
            .on("data", f => {
                const g = gather(f);
                if (g) {
                    gathered.push(g);
                }
            })
            .on("error", reject)
            .on("end", _ => {
                resolve(Promise.all(gathered).then(ts => ts.filter(t => !!t)));
            });
    });
}

/**
 * Perform the same operation on all the files.
 * Either run and flush the results, or defer.
 * @param project project to act on
 * @param globPattern glob pattern to match
 * @param op operation to perform on files. Can return void or a promise.
 */
export function doWithFiles<P extends ProjectAsync>(project: P,
                                                    globPattern: string,
                                                    op: (f: File) => void | Promise<any>): Promise<P> {
    return new Promise(
        (resolve, reject) => {
            const filePromises: Array<Promise<File>> = [];
            return project.streamFiles(globPattern)
                .on("data", f => {
                    const r = op(f);
                    if (isPromise(r)) {
                        filePromises.push(r.then(_ => f.flush()));
                    } else {
                        if (f.dirty) {
                            filePromises.push(f.flush());
                        }
                    }
                })
                .on("error", reject)
                .on("end", _ => {
                    resolve(Promise.all(filePromises));
                });
        }).then(files => project);
}

/**
 * Delete files matching the glob pattern and extra test (if supplied)
 * @param project project to act on
 * @param globPattern glob pattern for files to delete
 * @param test additional, optional test for files to be deleted
 * @return {RunOrDefer<number>}
 */
export function deleteFiles<T>(project: ProjectAsync,
                               globPattern: string,
                               test: (f: File) => boolean = f => true): Promise<number> {
    return new Promise((resolve, reject) => {
        let deleted = 0;
        project.streamFiles(globPattern)
            .on("data", f => {
                if (test(f)) {
                    ++deleted;
                    defer(project, project.deleteFile(f.path));
                }
            })
            .on("error", reject)
            .on("end", () => {
                resolve(project.flush()
                    .then(() => deleted));
            });
    });
}
