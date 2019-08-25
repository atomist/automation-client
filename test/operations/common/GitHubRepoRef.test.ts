
import * as assert from "power-assert";

import {
    beautifyPullRequestBody,
    GitHubRepoRef,
} from "../../../lib/operations/common/GitHubRepoRef";

describe("GitHubRepoRef tests", () => {

    it("defaults apiBase correctly", () => {
        const gh = new GitHubRepoRef("owner", "repo");
        assert(gh.apiBase === "api.github.com");
    });

    it("guesses the remote from the apiBase for github.com", () => {
        const gh = new GitHubRepoRef("owner", "repo");
        assert(gh.remoteBase === "github.com");
    });

    it("guesses the remote from the apiBase for GHE", () => {
        // Note: I am basing this on docs, not empirical testing.
        const gh = new GitHubRepoRef("owner", "repo", undefined, "https://my.ghe.host/api/v3/");
        assert(gh.remoteBase === "my.ghe.host");
        assert(gh.scheme === "https://");
    });

    it("takes new apiBase correctly", () => {
        const apiBase = "https://somewhere.com";
        const gh = new GitHubRepoRef("owner", "repo", undefined, apiBase);
        assert(gh.apiBase === "somewhere.com");
    });

    it("strips new apiBase trailing / correctly", () => {
        const apiBase = "https://somewhere.com/api/v3";
        const gh = new GitHubRepoRef("owner", "repo", undefined, apiBase + "/");
        assert.equal(gh.apiBase, "somewhere.com/api/v3");
    });

    it("doesn't set sha when sha is not provided", () => {
        const gh = GitHubRepoRef.from({ owner: "owner", repo: "repo", branch: "fester" });
        assert(!gh.sha);
    });

    it("does not let you provide a sha that is not a sha, when you could put that in branch", () => {
        assert.throws(() => GitHubRepoRef.from({ owner: "owner", repo: "repo", sha: "fester" }));
    });

    describe("GitHubRepoRef tests", () => {

        it("should process tags in PR body", () => {
            const body = `#### New NPM Package Target
Target version for NPM package *@atomist/sdm* is \`^1.6.1\`.
Project *atomist/sdm-pack-fingerprints/remove-global* is currently configured to use version \`^1.6.0\`.
[atomist:generated]



#### New NPM Package Target
Target version for NPM package *@atomist/sdm-core* is \`^1.6.1\`.
Project *atomist/sdm-pack-fingerprints/remove-global* is currently configured to use version \`^1.6.0\`.



[auto-merge:on-approve]




[auto-merge-method:squash] [auto-merge:on-approve] [auto-merge-method:squash] `;
            const expectedBody = `#### New NPM Package Target
Target version for NPM package *@atomist/sdm* is \`^1.6.1\`.
Project *atomist/sdm-pack-fingerprints/remove-global* is currently configured to use version \`^1.6.0\`.

#### New NPM Package Target
Target version for NPM package *@atomist/sdm-core* is \`^1.6.1\`.
Project *atomist/sdm-pack-fingerprints/remove-global* is currently configured to use version \`^1.6.0\`.

---
<details>
  <summary>Tags</summary>
<br/>
<code>[atomist:generated]</code><br/><code>[auto-merge-method:squash]</code><br/><code>[auto-merge-method:squash]</code><br/><code>[auto-merge:on-approve]</code><br/><code>[auto-merge:on-approve]</code>
</details>`;

            const newBody = beautifyPullRequestBody(body);
            assert.strictEqual(newBody, expectedBody);
        });

    });

});
