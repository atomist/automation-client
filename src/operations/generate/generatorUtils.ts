import { ActionResult } from "../../action/ActionResult";
import { HandlerContext } from "../../HandlerContext";
import { DefaultDirectoryManager } from "../../project/git/GitCommandGitProject";
import { NodeFsLocalProject } from "../../project/local/NodeFsLocalProject";
import { Project } from "../../project/Project";
import { ProjectOperationCredentials } from "../common/ProjectOperationCredentials";
import { RepoId } from "../common/RepoId";
import { AnyProjectEditor, ProjectEditor, toEditor } from "../edit/projectEditor";

/**
 * Function that knows how to persist a project.
 */
export type ProjectPersister<P = undefined> = (p: Project,
                                               credentials: ProjectOperationCredentials,
                                               params?: P) => Promise<ActionResult<Project>>;

/**
 * Generate given the starting point. Do not change the starting point.
 * @param {Promise<Project>} startingPoint
 * @param {HandlerContext} ctx
 * @param {ProjectOperationCredentials} credentials
 * @param {ProjectEditor} editor
 * @param {ProjectPersister<P>} persist
 * @param {P} params
 * @return {Promise<ActionResult<Project>>}
 */
export function generate<P = RepoId>(startingPoint: Promise<Project>,
                                     ctx: HandlerContext,
                                     credentials: ProjectOperationCredentials,
                                     editor: AnyProjectEditor,
                                     persist: ProjectPersister<P>,
                                     params: P): Promise<ActionResult<Project>> {
    const parentDir = DefaultDirectoryManager.opts.baseDir;
    return startingPoint
        .then(seed =>
            // Make a copy that we can work on
            NodeFsLocalProject.copy(seed, parentDir, this.targetRepo)
                .then(independentCopy => toEditor(editor)(independentCopy, ctx, this)
                    .then(r => r.target)))
        .then(populated =>
            persist(populated, credentials, params));

}
