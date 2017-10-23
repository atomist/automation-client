import { ActionResult } from "../../action/ActionResult";
import { HandlerContext } from "../../HandlerContext";
import { GitProject } from "../../project/git/GitProject";
import { Project } from "../../project/Project";
import { allReposInTeam } from "../common/allReposInTeamRepoFinder";
import { defaultRepoLoader } from "../common/defaultRepoLoader";
import { AllRepos, RepoFilter } from "../common/repoFilter";
import { RepoFinder } from "../common/repoFinder";
import { RepoLoader } from "../common/repoLoader";
import { doWithAllRepos } from "../common/repoUtils";
import { editRepo } from "../support/editorUtils";
import { EditMode, EditModeFactory, toEditModeFactory } from "./editModes";
import { EditResult, ProjectEditor } from "./projectEditor";

/**
 * Edit all the given repos with the given editor
 * @param {HandlerContext} ctx
 * @param {string} token
 * @param {ProjectEditor} editor
 * @param editInfo: EditMode determines how the edits should be applied.
 * Factory allows us to use different branches if necessary
 * @param parameters parameters (optional)
 * @param {RepoFinder} repoFinder
 * @param {} repoFilter
 * @param {RepoLoader} repoLoader
 * @return {Promise<Array<ActionResult<GitProject>>>}
 */
export function editAll<R, P>(ctx: HandlerContext,
                              token: string,
                              editor: ProjectEditor,
                              editInfo: EditMode | EditModeFactory,
                              parameters?: P,
                              repoFinder: RepoFinder = allReposInTeam(),
                              repoFilter: RepoFilter = AllRepos,
                              repoLoader: RepoLoader =
                                  defaultRepoLoader(token)): Promise<EditResult[]> {
    const edit = (p: Project, parms: P) =>
        editRepo(ctx, p, editor, toEditModeFactory(editInfo)(p), parms);
    return doWithAllRepos<EditResult, P>(ctx, token, edit, parameters,
        repoFinder, repoFilter, repoLoader);
}
