import * as _ from "lodash";
import { HandlerContext } from "../../HandlerContext";
import {
    ReposQuery,
    ReposQueryVariables,
} from "../../schema/schema";
import { GitHubRepoRef } from "./GitHubRepoRef";
import { RepoFinder } from "./repoFinder";
import { RepoRef } from "./RepoId";

// Hard-coded limit in GraphQL queries. Not sure why we can't pass this
const PageSize = 100;

/**
 * Use a GraphQL query to find all repos for the current team,
 * or look locally if appropriate, in current working directory
 * @param cwd directory to look in if this is local
 * @constructor
 */
export function allReposInTeam(): RepoFinder {
    return (context: HandlerContext) => {
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
    return context.graphClient.query<ReposQuery, ReposQueryVariables>({
        query: RepoQuery,
        variables: { teamId: context.workspaceId, offset },
    },
    )
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
