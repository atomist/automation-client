import { GitProject } from "../../project/git/GitProject";
import { ProjectPersister } from "./generatorUtils";
import { RemoteGitProjectPersister } from "./remoteGitProjectPersister";

/**
 * Kept only for backward compatibility: Use RemoteGitProjectPersister
 */
export const GitHubProjectPersister: ProjectPersister<GitProject> =
    RemoteGitProjectPersister;
