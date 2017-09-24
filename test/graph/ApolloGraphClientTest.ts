import "mocha";
import { ApolloGraphClient } from "../../src/graph/ApolloGraphClient";

import * as assert from "power-assert";
import { clone } from "../../src/project/git/GitLoader";
import { ReposQuery, ReposQueryVariables } from "../../src/schema/schema";
import { GitHubToken } from "../atomist.config";

describe("ApolloGraphClient", () => {

    it("should run repos query", done => {
        const agc = new ApolloGraphClient("https://db-f4cw1abeowdgtpe5etpy.graphenedb.com:24780/graphql/"
            , {Authorization: `Basic ${process.env.CORTEX_TOKEN}`});
        agc.executeFile<ReposQuery, ReposQueryVariables>("repos",
            {teamId: "T1L0VDKJP", offset: 0})
            .then(result => {
                // console.log(`Repos were ${JSON.stringify(result)}`);
                const org = result.ChatTeam[0].orgs[0];
                assert(org.repo.length > 0);
                const repo1 = org.repo[0];
                assert(repo1.name);
                assert(repo1.owner);
                done();
            })
            .catch(done);
    }).timeout(5000);

    // TODO this fails due to dirty data in staging: repos in DB that aren't present in github
    it.skip("should run repos query and clone repo", done => {
        const agc = new ApolloGraphClient("https://db-f4cw1abeowdgtpe5etpy.graphenedb.com:24780/graphql/"
            , {Authorization: `Basic ${process.env.CORTEX_TOKEN}`});
        agc.executeFile<ReposQuery, ReposQueryVariables>("repos",
            {teamId: "T1L0VDKJP", offset: 0})
            .then(result => {
                // console.log(`Repos were ${JSON.stringify(result)}`);
                const org = result.ChatTeam[0].orgs[0];
                assert(org.repo.length > 0);
                const repo1 = org.repo[0];
                clone(GitHubToken, repo1.owner, repo1.name)
                    .then(p => {
                        const readme = p.findFileSync("README.md");
                        assert(readme);
                        console.log(`README path=${readme.path}`);
                        done();
                    });
            })
            .catch(done);
    });
});
