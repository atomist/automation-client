import { NodeFsLocalProject } from "../../project/local/NodeFsLocalProject";
import { isLocalRepoRef, RepoRef } from "./RepoId";
import { RepoLoader } from "./repoLoader";

export const LocalRepoLoader: RepoLoader =
    (repoId: RepoRef) => {
        if (isLocalRepoRef(repoId)) {
            // Find it from the file system
            return NodeFsLocalProject.fromExistingDirectory(repoId, repoId.baseDir);
        } else {
            throw Promise.reject(`Not a local RepoId: [${JSON.stringify(repoId)}]`);
        }
    };
