import { HandlerContext } from "../../HandlerContext";
import { ActionResult } from "../../internal/util/ActionResult";
import { GitProject } from "../../project/git/GitProject";
import { allReposInTeam } from "../common/allReposInTeamRepoFinder";
import { defaultRepoLoader } from "../common/defaultRepoLoader";
import { ProjectPersister } from "../common/projectPersister";
import { AllRepos, RepoFilter } from "../common/repoFilter";
import { RepoFinder } from "../common/repoFinder";
import { RepoLoader } from "../common/repoLoader";
import { doWithAllRepos } from "../common/repoUtils";
import { ProjectEditor } from "./projectEditor";

/**
 * Edit all the given repos
 * @param {HandlerContext} ctx
 * @param {string} token
 * @param {ProjectEditor} editor
 * @param {RepoFinder} repoFinder
 * @param {} repoFilter
 * @param {RepoLoader} repoLoader
 * @param {ProjectPersister<GitProject>} pp
 * @return {Promise<Array<ActionResult<GitProject>>>}
 */
export function editAll<R>(ctx: HandlerContext,
                           token: string,
                           editor: ProjectEditor,
                           pp: ProjectPersister<GitProject>,
                           repoFinder: RepoFinder = allReposInTeam(),
                           repoFilter: RepoFilter = AllRepos,
                           repoLoader: RepoLoader = defaultRepoLoader(token),
                            ): Promise<Array<ActionResult<GitProject>>> {
    const actAndPersist = p =>
        pp(p, editor);
    return doWithAllRepos(ctx, token, actAndPersist, repoFinder, repoFilter, repoLoader);
}
