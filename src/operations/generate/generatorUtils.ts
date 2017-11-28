import { ActionResult } from "../../action/ActionResult";
import { HandlerContext } from "../../HandlerContext";
import { logger } from "../../internal/util/logger";
import { LocalProject } from "../../project/local/LocalProject";
import { NodeFsLocalProject } from "../../project/local/NodeFsLocalProject";
import { Project } from "../../project/Project";
import { DirectoryManager } from "../../spi/clone/DirectoryManager";
import { TmpDirectoryManager } from "../../spi/clone/tmpDirectoryManager";
import { ProjectOperationCredentials } from "../common/ProjectOperationCredentials";
import { RepoId } from "../common/RepoId";
import { AnyProjectEditor, ProjectEditor, toEditor } from "../edit/projectEditor";

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
 * Do not change the starting point. May perform additional
 * action after persisting the project.
 * @param {Promise<Project>} startingPoint
 * @param {HandlerContext} ctx
 * @param {ProjectOperationCredentials} credentials
 * @param {ProjectEditor} editor editor that does the actual transformation
 * @param persist persist function to persist the new project:
 * for example, to GitHub
 * @param targetId id of target repo for persistence
 * @param params optional parameters to be passed to persister
 * @param afterAction action to perform after project persistence.
 * @param directoryManager finds a directory for the new project; defaults to tmp
 */
export function generate<P extends Project = Project>(startingPoint: Promise<Project> | Project,
                                                      ctx: HandlerContext,
                                                      credentials: ProjectOperationCredentials,
                                                      editor: AnyProjectEditor,
                                                      persist: ProjectPersister<P>,
                                                      targetId: RepoId,
                                                      params?: object,
                                                      afterAction?: (p: P) => Promise<ActionResult<P>>,
                                                      directoryManager: DirectoryManager = TmpDirectoryManager): Promise<ActionResult<P>> {

    return directoryManager.directoryFor(targetId.owner, targetId.repo, "master", {})
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
                .then(persistenceResult => {
                    return afterAction ?
                        afterAction(persistenceResult.target)
                            .then(r => {
                                // Preserve any extra returned values from persister
                                return {
                                    ...persistenceResult,
                                    ...r,
                                };
                            }) :
                        persistenceResult;
                });
        });
}
