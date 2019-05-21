import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import * as assert from "power-assert";
import { BasicAuthCredentials } from "../../../lib/operations/common/BasicAuthCredentials";
import { BitBucketServerRepoRef } from "../../../lib/operations/common/BitBucketServerRepoRef";

export const BitBucketServerUsername = "username";
export const BitBucketServerPassword = "password";
export const BitBucketServerCredentials: BasicAuthCredentials = {
    username: BitBucketServerUsername,
    password: BitBucketServerPassword,
};

describe("BitBucketServer support", () => {

    describe("should return correct clone url", () => {
        it("for project", () => {
            const bitbucketServerRepoRef = new BitBucketServerRepoRef("https://bitbucket.organisation.co.za", "a-project", "test-app");
            assert(bitbucketServerRepoRef.cloneUrl(BitBucketServerCredentials)
                === "https://username:password@bitbucket.organisation.co.za/scm/a-project/test-app.git");
        });
        it("for user", () => {
            const bitbucketServerRepoRef = new BitBucketServerRepoRef("https://bitbucket.organisation.co.za", "a-user", "test-app", false);
            assert(bitbucketServerRepoRef.cloneUrl(BitBucketServerCredentials)
                === "https://username:password@bitbucket.organisation.co.za/scm/~a-user/test-app.git");
        });
    });

    describe("should return correct api path url component", () => {
        it("for project", () => {
            const bitbucketServerRepoRef = new BitBucketServerRepoRef("https://bitbucket.organisation.co.za", "a-project", "test-app");
            assert(bitbucketServerRepoRef.apiPathComponent === "projects/a-project/repos/test-app");
        });
        it("for user", () => {
            const bitbucketServerRepoRef = new BitBucketServerRepoRef("https://bitbucket.organisation.co.za", "a-user", "test-app", false);
            assert(bitbucketServerRepoRef.apiPathComponent === "projects/~a-user/repos/test-app");
        });
    });

    it("should create repo", () => {
        const mock = new MockAdapter(axios);

        mock.onPost("https://bitbucket.organisation.co.za/rest/api/1.0/projects/a-project/repos/")
            .reply(config => {
                const postData = JSON.parse(config.data);
                assert(postData.name === "test-app");
                assert(postData.scmId === "git");
                assert(postData.forkable === "true");
                return [201, {}];
            });

        const bitbucketServerRepoRef = new BitBucketServerRepoRef("https://bitbucket.organisation.co.za", "a-project", "test-app");
        return bitbucketServerRepoRef.createRemote(BitBucketServerCredentials, "a description", "true");
    });

    it("should delete repo", () => {
        const mock = new MockAdapter(axios);

        mock.onDelete("https://bitbucket.organisation.co.za/rest/api/1.0/projects/a-project/repos/test-app")
            .reply(202, {});

        const bitbucketServerRepoRef = new BitBucketServerRepoRef("https://bitbucket.organisation.co.za", "a-project", "test-app");
        return bitbucketServerRepoRef.deleteRemote(BitBucketServerCredentials);
    });

    it("should create pr with default reviewers", async () => {
        const mock = new MockAdapter(axios);

        mock.onGet("https://bitbucket.organisation.co.za/rest/api/1.0/projects/a-project/repos/test-app")
            .reply(200, {id: 1});

        mock.onGet("https://bitbucket.organisation.co.za/rest/default-reviewers/1.0/projects/a-project/repos/test-app/reviewers")
            .reply(200, [{name: "johndoe"}]);

        mock.onPost("https://bitbucket.organisation.co.za/rest/api/1.0/projects/a-project/repos/test-app/pull-requests")
            .reply(config => {
                const postData = JSON.parse(config.data);
                assert(postData.title === "Add a thing");
                assert(postData.description === "Mr Peanut Butter goes woof");
                assert(postData.fromRef.id === "refs/heads/thing1");
                assert(postData.toRef.id === "refs/heads/master");
                assert((postData.reviewers as any[]).length === 1);
                assert((postData.reviewers as any[])[0].user.name === "johndoe");
                return [201, {}];
            });

        const bitbucketServerRepoRef = new BitBucketServerRepoRef("https://bitbucket.organisation.co.za", "a-project", "test-app");
        return bitbucketServerRepoRef.raisePullRequest(
            BitBucketServerCredentials, "Add a thing",
            "Mr Peanut Butter goes woof", "refs/heads/thing1",
            "refs/heads/master");
    });

    it("should create pr without default reviewers", async () => {
        const mock = new MockAdapter(axios);

        mock.onGet("https://bitbucket.organisation.co.za/rest/api/1.0/projects/a-project/repos/test-app")
            .reply(200, {id: 1});

        mock.onGet("https://bitbucket.organisation.co.za/rest/default-reviewers/1.0/projects/a-project/repos/test-app/reviewers")
            .reply(200, []);

        mock.onPost("https://bitbucket.organisation.co.za/rest/api/1.0/projects/a-project/repos/test-app/pull-requests")
            .reply(config => {
                const postData = JSON.parse(config.data);
                assert(postData.title === "Add a thing");
                assert(postData.description === "Mr Peanut Butter goes woof");
                assert(postData.fromRef.id === "refs/heads/thing1");
                assert(postData.toRef.id === "refs/heads/master");
                assert((postData.reviewers as any[]).length === 0);
                return [201, {}];
            });

        const bitbucketServerRepoRef = new BitBucketServerRepoRef("https://bitbucket.organisation.co.za", "a-project", "test-app");
        return bitbucketServerRepoRef.raisePullRequest(
            BitBucketServerCredentials, "Add a thing",
            "Mr Peanut Butter goes woof", "refs/heads/thing1",
            "refs/heads/master");
    });
});
