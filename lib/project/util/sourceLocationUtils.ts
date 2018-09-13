import { SourceLocation } from "../../operations/common/SourceLocation";

import {
    File,
    isFile,
} from "../../project/File";

/**
 * Find the given source location within this project
 * @param {string} f file info: Path or File
 * @param {string} content
 * @param {number} offset
 * @return {SourceLocation}
 */
export function toSourceLocation(f: string | File, content: string, offset: number): SourceLocation {
    if (!content || offset < 0 || offset > content.length - 1) {
        return undefined;
    }

    const lines = content.substr(0, offset)
        .split("\n");
    return {
        path: isFile(f) ? f.path : f,
        lineFrom1: lines.length,
        columnFrom1: lines[lines.length - 1].length + 1,
        offset,
    };
}
