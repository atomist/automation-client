import * as fs from "fs-extra";

import { ActionResult } from "../../action/ActionResult";
import { HandlerContext } from "../../HandlerContext";
import { logger } from "../../internal/util/logger";
import { DefaultDirectoryManager } from "../../project/git/GitCommandGitProject";
import { LocalProject } from "../../project/local/LocalProject";
import { NodeFsLocalProject } from "../../project/local/NodeFsLocalProject";
import { Project } from "../../project/Project";
import { ProjectOperationCredentials } from "../common/ProjectOperationCredentials";
import { RepoId } from "../common/RepoId";
import { AnyProjectEditor, ProjectEditor, toEditor } from "../edit/projectEditor";
import { TmpDirectoryManager } from "../../spi/clone/tmpDirectoryManager";

/**
 * Function that knows how to persist a project using the given credentials.
 * Can take parameters and return a subclass of action result.
 */
export type ProjectPersister<P extends Project = Project,
    R extends ActionResult<P> = ActionResult<P>> =
    (p: Project,
     credentials: ProjectOperationCredentials,
     targetId: RepoId,
     params?: object) => Promise<R>;

/**
 * Generate a new project given the starting point project.
 * Do not change the starting point.
 * @param {Promise<Project>} startingPoint
 * @param {HandlerContext} ctx
 * @param {ProjectOperationCredentials} credentials
 * @param {ProjectEditor} editor editor that does the actual transformation
 * @param persist persist function to persist the new project:
 * for example, to GitHub
 * @param targetId id of target repo for persistence
 * @param params - optional parameters to be passed to persister
 */
export function generate(startingPoint: Promise<Project> | Project,
                         ctx: HandlerContext,
                         credentials: ProjectOperationCredentials,
                         editor: AnyProjectEditor,
                         persist: ProjectPersister,
                         targetId: RepoId,
                         params?: object): Promise<ActionResult<Project>> {

    return TmpDirectoryManager.directoryFor(targetId.owner, targetId.repo, "master", {})
        .then(newRepoDirectoryInfo => {
            return Promise.resolve(startingPoint) // it might be a promise
                .then(seed =>
                    // Make a copy that we can work on
                    NodeFsLocalProject.copy(seed, newRepoDirectoryInfo.path, newRepoDirectoryInfo.release))
                // Let's be sure we didn't inherit any old git stuff
                .then(independentCopy => independentCopy.deleteDirectory(".git"))
                .then(independentCopy => toEditor<object>(editor)(independentCopy, ctx, params))
                .then(r => r.target)
                .then(populated => {
                    logger.debug("Persisting repo at [%s]: owner/repo=%s:%s",
                        (populated as LocalProject).baseDir, targetId.owner, targetId.repo);
                    return persist(populated, credentials, targetId);
                })
        });
}
