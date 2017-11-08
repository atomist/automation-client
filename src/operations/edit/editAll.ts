import { ActionResult } from "../../action/ActionResult";
import { HandlerContext } from "../../HandlerContext";
import { GitProject } from "../../project/git/GitProject";
import { Project } from "../../project/Project";
import { allReposInTeam } from "../common/allReposInTeamRepoFinder";
import { defaultRepoLoader } from "../common/defaultRepoLoader";
import { fromListRepoFinder } from "../common/fromProjectList";
import { ProjectOperationCredentials } from "../common/ProjectOperationCredentials";
import { AllRepos, RepoFilter } from "../common/repoFilter";
import { RepoFinder } from "../common/repoFinder";
import { RepoRef } from "../common/RepoId";
import { RepoLoader } from "../common/repoLoader";
import { doWithAllRepos } from "../common/repoUtils";
import { editRepo } from "../support/editorUtils";
import { EditMode, EditModeFactory, toEditModeFactory } from "./editModes";
import { EditResult, failedEdit, ProjectEditor, successfulEdit } from "./projectEditor";

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
export function editAll<R, P>(ctx: HandlerContext,
                              credentials: ProjectOperationCredentials,
                              editor: ProjectEditor,
                              editInfo: EditMode | EditModeFactory,
                              parameters?: P,
                              repoFinder: RepoFinder = allReposInTeam(),
                              repoFilter: RepoFilter = AllRepos,
                              repoLoader: RepoLoader =
                                  defaultRepoLoader(credentials)): Promise<EditResult[]> {
    const edit = (p: Project, parms: P) =>
        editRepo(ctx, p, editor, toEditModeFactory(editInfo)(p), parms);
    return doWithAllRepos<EditResult, P>(ctx, credentials, edit, parameters,
        repoFinder, repoFilter, repoLoader);
}

/**
 * Edit the given repo with the given editor function, which depends only on the project
 * @param credentials credentials
 * @param {ProjectEditor} editor
 * @param editInfo: EditMode determines how the edits should be applied.
 * @param {RepoLoader} repoLoader (optional, useful in testing)
 * @return {Promise<EditResult>}
 */
export function editOne(credentials: ProjectOperationCredentials,
                        editor: (p: Project) => Promise<Project>,
                        editInfo: EditMode,
                        singleRepository: RepoRef,
                        repoLoader: RepoLoader = defaultRepoLoader(credentials)): Promise<EditResult> {
    const officialProjectEditor: ProjectEditor = (project, noContext, noParams) =>
        Promise.resolve(editor(project)).then(successfulEdit, err => failedEdit(project, err));

    const singleRepoFinder: RepoFinder = () => Promise.resolve([singleRepository]);

    return editAll(null, credentials, officialProjectEditor, editInfo, {},
        singleRepoFinder, AllRepos, repoLoader)
        .then(ers => ers[0]);
}
