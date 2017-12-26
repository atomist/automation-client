import "mocha";
import * as assert from "power-assert";

import * as _ from "lodash";

import { ApolloGraphClient } from "../../src/graph/ApolloGraphClient";
import { allReposInTeam } from "../../src/operations/common/allReposInTeamRepoFinder";
import { GitHubToken, SlackTeamId } from "./gitHubTest";

describe("allReposInOrgRepoFinder", () => {

    const graphClient = new ApolloGraphClient(`https://automation.atomist.com/graphql/team/${SlackTeamId}`,
        { Authorization: `token ${GitHubToken}` });

    it("finds over 100 repos in org", done => {
        allReposInTeam()({ graphClient, teamId: SlackTeamId } as any)
            .then(repos => {
                assert(repos.length > 100, `Expected over 100 repos, not ${repos.length}`);
                const names = repos.map(r => `${r.owner}/${r.repo}`).sort();
                assert(_.uniq(names).length === names.length);
            }).then(() => done(), done);
    }).timeout(10000);

});
