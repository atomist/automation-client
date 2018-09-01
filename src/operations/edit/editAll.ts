import { HandlerContext } from "../../HandlerContext";
import { Project } from "../../project/Project";
import { defaultRepoLoader } from "../common/defaultRepoLoader";
import { EditorOrReviewerParameters } from "../common/params/BaseEditorOrReviewerParameters";
import { ProjectOperationCredentials } from "../common/ProjectOperationCredentials";
import { AllRepos, RepoFilter } from "../common/repoFilter";
import { RepoFinder } from "../common/repoFinder";
import { RepoRef } from "../common/RepoId";
import { RepoLoader } from "../common/repoLoader";
import { doWithAllRepos } from "../common/repoUtils";
import { editRepo } from "../support/editorUtils";
import { EditMode, EditModeFactory, toEditModeFactory } from "./editModes";
import { AnyProjectEditor, EditResult, ProjectEditor, toEditor } from "./projectEditor";

/**
 * Edit all the given repos with the given editor
 * @param {HandlerContext} ctx
 * @param credentials credentials
 * @param {ProjectEditor} editor
 * @param editInfo: EditMode determines how the edits should be applied.
 * Factory allows us to use different branches if necessary
 * @param parameters parameters (optional)
 * @param {RepoFinder} repoFinder
 * @param {} repoFilter
 * @param {RepoLoader} repoLoader
 * @return {Promise<Array<EditResult>>}
 */
export function editAll<R, P extends EditorOrReviewerParameters>(ctx: HandlerContext,
                                                                 credentials: ProjectOperationCredentials,
                                                                 editor: AnyProjectEditor,
                                                                 editInfo: EditMode | EditModeFactory,
                                                                 parameters: P,
                                                                 repoFinder: RepoFinder,
                                                                 repoFilter: RepoFilter = AllRepos,
                                                                 repoLoader: RepoLoader =
        defaultRepoLoader(credentials)): Promise<EditResult[]> {
    const edit = (p: Project, parms: P) =>
        editRepo(ctx, p, toEditor(editor), toEditModeFactory(editInfo)(p),
            parms);
    return doWithAllRepos<EditResult, P>(ctx, credentials, edit, parameters,
        repoFinder, repoFilter, repoLoader);
}

/**
 * Edit the given repo with the given editor function, which depends only on the project
 * @param {HandlerContext} ctx
 * @param credentials credentials
 * @param {ProjectEditor} editor
 * @param editInfo: EditMode determines how the edits should be applied.
 * @param singleRepository reference to the single repo to edit
 * @param parameters parameters (optional)
 * @param {RepoLoader} repoLoader (optional, useful in testing)
 * @return {Promise<EditResult>}
 */
export function editOne<P extends EditorOrReviewerParameters>(ctx: HandlerContext,
                                                              credentials: ProjectOperationCredentials,
                                                              editor: AnyProjectEditor,
                                                              editInfo: EditMode,
                                                              singleRepository: RepoRef,
                                                              parameters?: P,
                                                              repoLoader: RepoLoader = defaultRepoLoader(credentials)): Promise<EditResult> {
    const singleRepoFinder: RepoFinder = () => Promise.resolve([singleRepository]);
    return editAll(ctx, credentials, toEditor(editor), editInfo, parameters,
        singleRepoFinder, AllRepos, repoLoader)
        .then(ers => ers[0]);
}
