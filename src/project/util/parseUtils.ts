import { File } from "../File";

import { Microgrammar } from "@atomist/microgrammar/Microgrammar";
import { PatternMatch } from "@atomist/microgrammar/PatternMatch";
import { RunOrDefer } from "../../internal/common/Flushable";
import { logger } from "../../internal/util/logger";
import { ProjectNonBlocking, ProjectScripting } from "../Project";
import { doWithFiles, saveFromFilesAsync } from "./projectUtils";

export type Match<M> = M & PatternMatch;

/**
 * Matches within a particular file
 */
export interface FileWithMatches<M> {

    file: File;

    content: string;

    matches: Array<Match<M>>;

    /**
     * Make matches updatable
     */
    makeUpdatable(): void;
}

/**
 * Integrate microgrammars with project operations to find all matches
 * @param p project
 * @param globPattern file glob pattern
 * @param microgrammar microgrammar to run against each eligible file
 * @return {Promise<T[]>} hit record for each matching file
 */
export function findMatches<M>(p: ProjectNonBlocking,
                               globPattern: string,
                               microgrammar: Microgrammar<M>): Promise<Array<Match<M>>> {
    return findFileMatches(p, globPattern, microgrammar)
        .then(fileHits => {
            let matches: Array<Match<M>> = [];
            fileHits.forEach(fh => matches = matches.concat(fh.matches));
            return matches;
        });
}

/**
 * Integrate microgrammars with project operations to find all matches
 * @param p project
 * @param globPattern file glob pattern
 * @param microgrammar microgrammar to run against each eligible file
 * @return {Promise<T[]>} hit record for each matching file
 */
export function findFileMatches<M>(p: ProjectNonBlocking,
                                   globPattern: string,
                                   microgrammar: Microgrammar<M>): Promise<Array<FileWithMatches<M>>> {
    return saveFromFilesAsync(p, globPattern, file => {
        return file.getContent()
            .then(content => {
                const matches = microgrammar.findMatches(content);
                if (matches.length > 0) {
                    logger.debug(`${matches.length} matches in [${file.path}]`);
                    return new UpdatingFileHits(p, file, matches, content);
                } else {
                    logger.debug(`No matches in [${file.path}]`);
                    return undefined;
                }
            });
    });
}

/**
 * Manipulate each file match containing an actual match. Will automatically match if necessary.
 * @param {ProjectNonBlocking} p
 * @param {string} globPattern
 * @param {Microgrammar<M>} microgrammar
 * @param {(fh: FileWithMatches<M>) => void} action
 * @param opts options
 * @return {RunOrDefer<any>}
 */
export function doWithFileMatches<M>(p: ProjectNonBlocking,
                                     globPattern: string,
                                     microgrammar: Microgrammar<M>,
                                     action: (fh: FileWithMatches<M>) => void,
                                     opts: { makeUpdatable: boolean } = {makeUpdatable: true}): RunOrDefer<File[]> {
    return doWithFiles(p, globPattern, file => {
        return file.getContent()
            .then(content => {
                const matches = microgrammar.findMatches(content);
                if (matches && matches.length > 0) {
                    logger.debug(`${matches.length} matches in [${file.path}]`);
                    const fh = new UpdatingFileHits(p, file, matches, content);
                    if (opts.makeUpdatable) {
                        fh.makeUpdatable();
                    }
                    action(fh);
                } else {
                    logger.debug(`No matches in [${file.path}]`);
                    return undefined;
                }
            });
    });
}

/**
 * Convenience function to operate on the sole match in the project.
 * Fail if zero or more than one.
 * @param {ProjectNonBlocking} p
 * @param {string} globPattern
 * @param {Microgrammar<M>} microgrammar
 * @param {(m: M) => void} action
 * @param {{makeUpdatable: boolean}} opts
 * @return {RunOrDefer<File[]>}
 */
export function doWithUniqueMatch<M>(p: ProjectNonBlocking,
                                     globPattern: string,
                                     microgrammar: Microgrammar<M>,
                                     action: (m: M) => void,
                                     opts: { makeUpdatable: boolean } = {makeUpdatable: true}): RunOrDefer<File[]> {
    let count = 0;
    const guardedAction = (fh: FileWithMatches<M>) => {
        if (fh.matches.length !== 1) {
            throw new Error(`Expected 1 match, not ${fh.matches.length}`);
        }
        if (count++ !== 0) {
            throw new Error("More than one match found in project");
        }
        const m0 = fh.matches[0];
        action(m0);
    };
    return doWithFileMatches(p, globPattern, microgrammar, guardedAction, opts)
        .transform(files => {
            if (count++ === 0) {
                throw new Error("No unique match found in project");
            }
            return files;
        });
}

/**
 * Similar to doWithUniqueMatch, but accepts zero matches without error
 * @param {ProjectNonBlocking} p
 * @param {string} globPattern
 * @param {Microgrammar<M>} microgrammar
 * @param {(m: M) => void} action
 * @param {{makeUpdatable: boolean}} opts
 * @return {RunOrDefer<File[]>}
 */
export function doWithAtMostOneMatch<M>(p: ProjectNonBlocking,
                                        globPattern: string,
                                        microgrammar: Microgrammar<M>,
                                        action: (m: M) => void,
                                        opts: { makeUpdatable: boolean } = {makeUpdatable: true}): RunOrDefer<File[]> {
    let count = 0;
    const guardedAction = (fh: FileWithMatches<M>) => {
        if (fh.matches.length !== 1) {
            throw new Error(`Expected at most 1 match, not ${fh.matches.length}`);
        }
        if (count++ !== 0) {
            throw new Error("More than one match found in project");
        }
        const m0 = fh.matches[0];
        action(m0);
    };
    return doWithFileMatches(p, globPattern, microgrammar, guardedAction, opts);
}

/**
 * Hits within a file
 */
class UpdatingFileHits<M> implements FileWithMatches<M> {

    private updatable = false;

    constructor(private project: ProjectScripting, public readonly file: File,
                public matches: Array<Match<M>>, public content: string) {
    }

    public makeUpdatable() {
        if (!this.updatable) {
            const um = Microgrammar.updatable<M>(this.matches, this.content);

            // TODO this cast is ugly
            this.matches = um.matches as Array<Match<M>>;
            this.file.recordAction(f => {
                return f.getContent().then(content => {
                    if (content !== um.updated()) {
                        console.log(`Updating content of [${f.path}] to [${um.updated()}]`);
                        return f.setContent(um.updated());
                    }
                    return f;
                });
            });
            this.project.trackFile(this.file);
            this.updatable = true;
        }
    }
}
