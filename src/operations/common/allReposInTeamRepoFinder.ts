import { HandlerContext } from "../../HandlerContext";
import { ReposQuery, ReposQueryVariables } from "../../schema/schema";
import { twoTierDirectoryRepoFinder } from "./localRepoFinder";
import { RepoFinder } from "./RepoFinder";
import { RepoId, SimpleRepoId } from "./RepoId";

// Hard-coded limit in GraphQL queries. Not sure why we can't pass this
const PageSize = 100;

/**
 * Use a GraphQL query to find all repos for the current team,
 * or look locally if appropriate, in current working directory
 * @param cwd directory to look in if this is local
 * @constructor
 */
export function allReposInTeam(cwd?: string): RepoFinder {
    return (context: HandlerContext) => {
        if (cwd) {
            return twoTierDirectoryRepoFinder(cwd)(context);
        }
        return queryForPage(context, 0);
    };
}

/**
 * Recursively query for repos from the present offset
 * @param {HandlerContext} context
 * @param {number} offset
 * @return {Promise<RepoId[]>}
 */
function queryForPage(context: HandlerContext, offset: number): Promise<RepoId[]> {
    return context.graphClient.executeFile<ReposQuery, ReposQueryVariables>(
        "repos",
        {teamId: context.teamId, offset})
        .then(result => {
            const org = result.ChatTeam[0].orgs[0];
            return org.repo.map(r => new SimpleRepoId(r.owner, r.name));
        })
        .then((repos: RepoId[]) => {
            return (repos.length < PageSize) ?
                repos :
                queryForPage(context, offset + PageSize)
                    .then(moreRepos => repos.concat(moreRepos));
        });
}
