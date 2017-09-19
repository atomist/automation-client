import { File } from "../File";

import { Microgrammar } from "@atomist/microgrammar/Microgrammar";
import { PatternMatch } from "@atomist/microgrammar/PatternMatch";
import { ProjectNonBlocking, ProjectScripting } from "../Project";
import { saveFromFiles, saveFromFilesAsync } from "./projectUtils";

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
 * @return {Promise<T[]>}
 */
export function findFileMatches<M>(p: ProjectNonBlocking,
                                   globPattern: string,
                                   microgrammar: Microgrammar<M>): Promise<Array<FileHits<M>>> {
    return saveFromFilesAsync(p, globPattern, file => {
        return file.getContent().then(content => {
            const matches = microgrammar.findMatches(content);
            return new UpdatingFileHits(p, file, matches, content);
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
        const um = Microgrammar.updatable<M>(this.matches, this.content);

        // TODO this cast is ugly
        this.matches = um.matches as Array<Match<M>>;
        this.project.trackFile(this.file);
        this.file.recordAction(f => {
            return f.setContent(um.updated());
        });
    }
}
