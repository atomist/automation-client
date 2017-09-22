import { File } from "../File";

import { Microgrammar } from "@atomist/microgrammar/Microgrammar";
import { PatternMatch } from "@atomist/microgrammar/PatternMatch";
import { RunOrDefer } from "../../internal/common/Flushable";
import { logger } from "../../internal/util/logger";
import { ProjectNonBlocking, ProjectScripting } from "../Project";
import { doWithFiles, saveFromFiles, saveFromFilesAsync } from "./projectUtils";

export type Match<M> = M & PatternMatch;

/**
 * Matches within a particular file
 */
export interface FileHits<M> {

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
export function findFileMatches<M>(p: ProjectNonBlocking,
                                   globPattern: string,
                                   microgrammar: Microgrammar<M>): Promise<Array<FileHits<M>>> {
    return saveFromFilesAsync(p, globPattern, file => {
        return file.getContent()
            .then(content => {
                const matches = microgrammar.findMatches(content);
                if (matches.length > 0) {
                    logger.debug(`${matches.length} matches in [${file.path}]`);
                    return new UpdatingFileHits(p, file, matches, content);
                } else {
                    logger.debug(`No matches in [${file.path}`);
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
 * @param {(fh: FileHits<M>) => void} action
 * @return {RunOrDefer<any>}
 */
export function doWithMatches<M>(p: ProjectNonBlocking,
                                 globPattern: string,
                                 microgrammar: Microgrammar<M>,
                                 action: (fh: FileHits<M>) => void): RunOrDefer<any> {
    return doWithFiles(p, globPattern, file => {
        return file.getContent()
            .then(content => {
                const matches = microgrammar.findMatches(content);
                if (matches.length > 0) {
                    logger.debug(`${matches.length} matches in [${file.path}]`);
                    const fh = new UpdatingFileHits(p, file, matches, content);
                    action(fh);
                } else {
                    logger.debug(`No matches in [${file.path}`);
                    return undefined;
                }
            });
    });
}

/**
 * Hits within a file
 */
class UpdatingFileHits<M> implements FileHits<M> {

    constructor(private project: ProjectScripting, public readonly file: File,
                public matches: Array<Match<M>>, public content: string) {
    }

    public makeUpdatable() {
        console.log("Makeupdatable for " + this.file.path);
        const um = Microgrammar.updatable<M>(this.matches, this.content);

        // TODO this cast is ugly
        this.matches = um.matches as Array<Match<M>>;
        console.log("Recording action in ufh");
        this.file.recordAction(f => {
            console.log("Executing action: Updating " + f.path);
            return f.setContent(um.updated());
        });
        this.project.trackFile(this.file);
    }
}
