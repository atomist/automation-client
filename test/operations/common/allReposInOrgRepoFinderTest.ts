import "mocha";
import * as assert from "power-assert";
import { ApolloGraphClient } from "../../../src/graph/ApolloGraphClient";
import { allReposInTeam } from "../../../src/operations/common/allReposInTeamRepoFinder";

import * as _ from "lodash";

describe("allReposInOrgRepoFinder", () => {

    const teamId = "T1L0VDKJP";

    const graphClient = new ApolloGraphClient(`https://automation-staging.atomist.services/graphql/team/${teamId}`
        , {Authorization: `token ${process.env.GITHUB_TOKEN}`});

    it("finds over 100 repos in org", done => {
        allReposInTeam()({graphClient, teamId} as any)
            .then(repos => {
                assert(repos.length > 100, `Expected over 100 repos, not ${repos.length}`);
                const names = repos.map(r => r.repo).sort();
                assert(_.uniq(names).length === names.length);
                // console.log(repos.map(r => `${r.owner}:${r.repo}`).join("\n"))
                done();
            })
            .catch(done);
    }).timeout(10000);

});
