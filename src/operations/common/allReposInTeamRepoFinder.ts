import * as _ from "lodash";
import { HandlerContext } from "../../HandlerContext";
import { ReposQuery, ReposQueryVariables } from "../../schema/schema";
import { GitHubRepoRef } from "./GitHubRepoRef";
import { twoTierDirectoryRepoFinder } from "./localRepoFinder";
import { RepoFinder } from "./repoFinder";
import { RepoRef } from "./RepoId";

// Hard-coded limit in GraphQL queries. Not sure why we can't pass this
const PageSize = 100;

/**
 * Use a GraphQL query to find all repos for the current team,
 * or look locally if appropriate, in current working directory
 *
 * DEPRECATED: there's a better one in @atomist/sdm
 *
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

const RepoQuery = `
query Repos($teamId: ID!, $offset: Int!) {
    ChatTeam(id: $teamId) {
        orgs {
            repo(first: 100, offset: $offset) {
                owner
                name
            }
        }
    }
}
`;

/**
 * Recursively query for repos from the present offset
 * @param {HandlerContext} context
 * @param {number} offset
 * @return {Promise<RepoRef[]>}
 */
function queryForPage(context: HandlerContext, offset: number): Promise<RepoRef[]> {
    return context.graphClient.executeQuery<ReposQuery, ReposQueryVariables>(
        RepoQuery,
        { teamId: context.teamId, offset })
        .then(result => {
            return _.flatMap(result.ChatTeam[0].orgs, org =>
                org.repo.map(r => new GitHubRepoRef(r.owner, r.name)));
        })
        .then((repos: RepoRef[]) => {
            return (repos.length < PageSize) ?
                repos :
                queryForPage(context, offset + PageSize)
                    .then(moreRepos => repos.concat(moreRepos));
        });
}
