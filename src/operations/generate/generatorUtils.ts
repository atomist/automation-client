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
export type ProjectPersister<PARAMS = undefined, P extends Project = Project,
    R extends ActionResult<P> = ActionResult<P>> =
    (p: Project,
     credentials: ProjectOperationCredentials,
     params?: PARAMS) => Promise<R>;

/**
 * Generate a new project given the starting point project.
 * Do not change the starting point.
 * @param {Promise<Project>} startingPoint
 * @param {HandlerContext} ctx
 * @param {ProjectOperationCredentials} credentials
 * @param {ProjectEditor} editor editor that does the actual transformation
 * @param {ProjectPersister<PARAMS>} persist function to persist the new project:
 * for example, to GitHub
 * @param {PARAMS} params - contain repo identification for persistence
 * @return {Promise<R>}
 */
export function generate<PARAMS extends RepoId,
    R extends ActionResult<Project> = ActionResult<Project>>(startingPoint: Promise<Project> | Project,
                                                             ctx: HandlerContext,
                                                             credentials: ProjectOperationCredentials,
                                                             editor: AnyProjectEditor<any>,
                                                             persist: ProjectPersister<PARAMS, Project, R>,
                                                             params: PARAMS): Promise<R> {
    const parentDir = DefaultDirectoryManager.opts.baseDir;
    logger.debug("Independent copy of seed will be at %s/%s: owner/repo=%s:%s",
        parentDir, params.repo, params.owner, params.repo);
    return fs.remove(parentDir + "/" + params.repo)
        .then(() => Promise.resolve(startingPoint)
            .then(seed =>
                // Make a copy that we can work on
                NodeFsLocalProject.copy(seed, parentDir, params.repo))
            // Let's be sure we didn't inherit any old git stuff
            .then(proj => proj.deleteDirectory(".git"))
            .then(independentCopy => toEditor(editor)(independentCopy, ctx, params))
            .then(r => r.target)
            .then(populated => {
                logger.debug("Persisting repo at [%s]: owner/repo=%s:%s",
                    (populated as LocalProject).baseDir, params.owner, params.repo);
                return persist(populated, credentials, params);
            }));
}
