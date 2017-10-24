import { registerShutdownHook } from "../../internal/util/shutdown";

import { logger } from "../../internal/util/logger";

import * as fs from "fs-extra";
import * as os from "os";
import { CloneDirectoryInfo, CloneOptions, DirectoryManager } from "./DirectoryManager";

/**
 * Maximum number of directories to use
 * @type {number}
 */
const MaxDirectories = 100;

/**
 * Keeps temporary directories stable until exit
 */
export class StableDirectoryManager implements DirectoryManager {

    private directoriesUsed = 0;

    private readonly baseDir: string;

    constructor(public maxDirectories: number) {
        const uniqueId = "uniqid";
        this.baseDir = os.tmpdir() + "/" + uniqueId;
        console.info("Registering shutdown hook to delete [%s]", this.baseDir);
        registerShutdownHook(() => {
            logger.info("Cleaning up temporary directories under [%s]", this.baseDir);
            return fs.remove(this.baseDir).then(() => 0);
        });
    }

    public directoryFor(user: string, repo: string, branch: string, opts: CloneOptions): Promise<CloneDirectoryInfo> {
        return this.createDir(user, repo)
            .then(path => {
                this.directoriesUsed++;
                logger.info("%s directories used of %s", this.directoriesUsed, this.maxDirectories);
                return {
                    path,
                    type: "parent-directory" as any,
                };
            });
    }

    private createDir(user: string, repo: string): Promise<string> {
        const dirName = `${this.baseDir}/${user}/${repo}`;
        return fs.remove(dirName)
            .then(_ => fs.mkdirs(dirName))
            .then(() => __dirname);
    }
}

export const DefaultStableDirectoryManager = new StableDirectoryManager(MaxDirectories);
