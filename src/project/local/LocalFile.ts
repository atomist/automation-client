import { File } from "../File";

/**
 * Implementation of File interface backed by local file system
 */
export interface LocalFile extends File {

    /**
     * Real, operating system dependent, path to the file.
     */
    realPath: string;

}
