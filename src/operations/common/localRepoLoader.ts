import { NodeFsLocalProject } from "../../project/local/NodeFsLocalProject";
import { isLocalDirectory, RepoId } from "./RepoId";
import { RepoLoader } from "./repoLoader";

export const LocalRepoLoader: RepoLoader =
    (repoId: RepoId) => {
        if (isLocalDirectory(repoId.provider)) {
            // Find it from the file system
            return Promise.resolve(new NodeFsLocalProject(repoId.repo, repoId.provider.baseDir));
        } else {
            throw Promise.reject(`Not a local RepoId: [${JSON.stringify(repoId)}]`);
        }
    };
