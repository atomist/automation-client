import { HandlerContext } from "../../HandlerContext";
import { ActionResult } from "../../internal/util/ActionResult";
import { GitProject } from "../../project/git/GitProject";
import { Project } from "../../project/Project";
import { allReposInTeam } from "../common/allReposInTeamRepoFinder";
import { defaultRepoLoader } from "../common/defaultRepoLoader";
import { AllRepos, RepoFilter } from "../common/repoFilter";
import { RepoFinder } from "../common/repoFinder";
import { RepoLoader } from "../common/repoLoader";
import { doWithAllRepos } from "../common/repoUtils";
import { loadAndEditRepo } from "../support/editorUtils";
import { EditInfo, EditInfoFactory, isEditInfo } from "./editModes";
import { EditResult, ProjectEditor } from "./projectEditor";

/**
 * Edit all the given repos with the given editor
 * @param {HandlerContext} ctx
 * @param {string} token
 * @param {ProjectEditor} editor
 * @param editInfo: EditInfo determines how the edits should be applied.
 * Factory allows us to use different branches if necessary
 * @param {RepoFinder} repoFinder
 * @param {} repoFilter
 * @param {RepoLoader} repoLoader
 * @return {Promise<Array<ActionResult<GitProject>>>}
 */
export function editAll<R>(ctx: HandlerContext,
                           token: string,
                           editor: ProjectEditor,
                           editInfo: EditInfo | EditInfoFactory,
                           repoFinder: RepoFinder = allReposInTeam(),
                           repoFilter: RepoFilter = AllRepos,
                           repoLoader: RepoLoader = defaultRepoLoader(token)): Promise<EditResult[]> {
    const ei: (project: Project) => EditInfo = p =>
        isEditInfo(editInfo) ? editInfo : editInfo(p);
    const edit = (p: Project) => loadAndEditRepo(token, ctx, p, editor, ei(p));
    return doWithAllRepos<EditResult>(ctx, token, edit, repoFinder, repoFilter, repoLoader);
}
