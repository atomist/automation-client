// tslint:disable-next-line:import-blacklist
import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import * as assert from "power-assert";
import { BasicAuthCredentials } from "../../../lib/operations/common/BasicAuthCredentials";
import { BitBucketServerRepoRef } from "../../../lib/operations/common/BitBucketServerRepoRef";
import { PullRequestReviewerType } from "../../../lib/operations/common/RepoId";
import * as httpClient from "../../../lib/spi/http/httpClient";

export const BitBucketServerUsername = "username";
export const BitBucketServerPassword = "password";
export const BitBucketServerCredentials: BasicAuthCredentials = {
    username: BitBucketServerUsername,
    password: BitBucketServerPassword,
};

describe("BitBucketServer support", () => {

    let origDefaultRetryOptions: any;
    before(() => {
        origDefaultRetryOptions = Object.getOwnPropertyDescriptor(httpClient, "DefaultHttpClientOptions");
        Object.defineProperty(httpClient, "DefaultHttpClientOptions", {
            value: {
                method: httpClient.HttpMethod.Get,
                headers: {},
                retry: {
                    retries: 0,
                    factor: 1,
                    minTimeout: 10,
                    maxTimeout: 10,
                    randomize: false,
                },
            },
        });
    });
    after(() => {
        Object.defineProperty(httpClient, "DefaultHttpClientOptions", origDefaultRetryOptions);
    });

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
        getRepo(mock);
        getRepoDefaultReviewers(mock, ["johndoe"]);
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

    it("should create pr with default reviewers and merge manually supplied ones", async () => {
        const mock = new MockAdapter(axios);

        getRepo(mock);
        getRepoDefaultReviewers(mock, ["johndoe"]);
        mock.onPost("https://bitbucket.organisation.co.za/rest/api/1.0/projects/a-project/repos/test-app/pull-requests")
            .reply(config => {
                const postData = JSON.parse(config.data);
                assert((postData.reviewers as any[]).length === 2);
                assert((postData.reviewers as any[])[0].user.name === "johndoe");
                assert((postData.reviewers as any[])[1].user.name === "janedoe");
                return [201, {}];
            });

        const bitbucketServerRepoRef = new BitBucketServerRepoRef("https://bitbucket.organisation.co.za", "a-project", "test-app");
        return bitbucketServerRepoRef.raisePullRequest(
            BitBucketServerCredentials, "Add a thing",
            "Mr Peanut Butter goes woof", "refs/heads/thing1",
            "refs/heads/master",
            [
                { type: PullRequestReviewerType.individual, name: "janedoe" },
            ],
        );
    });

    it("should create pr with only manually supplied reviewers", async () => {
        const mock = new MockAdapter(axios);
        getRepo(mock);
        getRepoDefaultReviewers(mock, []);
        mock.onPost("https://bitbucket.organisation.co.za/rest/api/1.0/projects/a-project/repos/test-app/pull-requests")
            .reply(config => {
                const postData = JSON.parse(config.data);
                assert((postData.reviewers as any[]).length === 1);
                assert((postData.reviewers as any[])[0].user.name === "janedoe");
                return [201, {}];
            });

        const bitbucketServerRepoRef = new BitBucketServerRepoRef("https://bitbucket.organisation.co.za", "a-project", "test-app");
        return bitbucketServerRepoRef.raisePullRequest(
            BitBucketServerCredentials, "Add a thing",
            "Mr Peanut Butter goes woof", "refs/heads/thing1",
            "refs/heads/master",
            [{ type: PullRequestReviewerType.individual, name: "janedoe" }],
        );
    });

    it("should throw when team reviewers are supplied", async () => { // Bitbucket doesn't support team reviewers
        const mock = new MockAdapter(axios);
        getRepo(mock);
        getRepoDefaultReviewers(mock, []);
        const bitbucketServerRepoRef = new BitBucketServerRepoRef("https://bitbucket.organisation.co.za", "a-project", "test-app");
        try {
            await bitbucketServerRepoRef.raisePullRequest(
                BitBucketServerCredentials, "Add a thing",
                "Mr Peanut Butter goes woof", "refs/heads/thing1",
                "refs/heads/master",
                [{ type: PullRequestReviewerType.team, name: "testgroup" },
                { type: PullRequestReviewerType.individual, name: "testperson" }] as any);
        } catch (err) {
            assert.strictEqual(err.message, "Bitbucket only supports reviewer type of individual!  Found [\"team\",\"individual\"]");
        }
    });

    it("should create pr without default reviewers", async () => {
        const mock = new MockAdapter(axios);
        getRepo(mock);
        getRepoDefaultReviewers(mock, []);
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

    it("should throw when creating PR fails", async () => {
        const mock = new MockAdapter(axios);
        getRepo(mock);
        getRepoDefaultReviewers(mock, []);
        mock.onPost("https://bitbucket.organisation.co.za/rest/api/1.0/projects/a-project/repos/test-app/pull-requests")
            .reply(() => {
                return [403, {}];
            });
        const bitbucketServerRepoRef = new BitBucketServerRepoRef("https://bitbucket.organisation.co.za", "a-project", "test-app");
        let thrown = false;
        try {
            await bitbucketServerRepoRef.raisePullRequest(
                BitBucketServerCredentials, "Add a thing",
                "Mr Peanut Butter goes woof", "refs/heads/thing1",
                "refs/heads/master");
        } catch (err) {
            thrown = true;
            assert.strictEqual(err.message, "Error attempting to raise PR: Request failed with status code 403");
        }
        assert(thrown, "no error thrown");
    });

});

function getRepo(mock: MockAdapter): void {
    mock.onGet("https://bitbucket.organisation.co.za/rest/api/1.0/projects/a-project/repos/test-app")
        .reply(200, { id: 1 });
}

function getRepoDefaultReviewers(mock: MockAdapter, users: string[]): void {
    // tslint:disable-next-line:max-line-length
    mock.onGet("https://bitbucket.organisation.co.za/rest/default-reviewers/1.0/projects/a-project/repos/test-app/reviewers?sourceRepoId=1&targetRepoId=1&sourceRefId=refs/heads/thing1&targetRefId=refs/heads/master")
        .reply(200, users.map(u => ({ name: u })));
}
