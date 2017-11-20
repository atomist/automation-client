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
    const parentDir = DefaultDirectoryManager.opts.baseDir;
    logger.debug("Independent copy of seed will be at %s/%s: owner/repo=%s:%s",
        parentDir, targetId.repo, targetId.owner, targetId.repo);
    return fs.remove(parentDir + "/" + targetId.repo)
        .then(() => Promise.resolve(startingPoint)
            .then(seed =>
                // Make a copy that we can work on
                NodeFsLocalProject.copy(seed, parentDir, targetId.repo))
            // Let's be sure we didn't inherit any old git stuff
            .then(proj => proj.deleteDirectory(".git"))
            .then(independentCopy => toEditor<object>(editor)(independentCopy, ctx, params))
            .then(r => r.target)
            .then(populated => {
                logger.debug("Persisting repo at [%s]: owner/repo=%s:%s",
                    (populated as LocalProject).baseDir, targetId.owner, targetId.repo);
                return persist(populated, credentials, targetId);
            }));
}
