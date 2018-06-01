import "mocha";
import * as assert from "power-assert";

import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import * as stringify from "json-stringify-safe";
import { HandlerContext } from "../../../src/HandlerContext";
import { RedirectResult } from "../../../src/HandlerResult";
import { BaseSeedDrivenGeneratorParameters } from "../../../src/operations/generate/BaseSeedDrivenGeneratorParameters";
import { generatorHandler } from "../../../src/operations/generate/generatorToCommand";
import { GitHubRepoCreationParameters } from "../../../src/operations/generate/GitHubRepoCreationParameters";
import { mockProjectPersister } from "./generatorUtilsTest";

describe("generatorToCommand in action", () => {

    it("adds Atomist webhook to repo", done => {
        const owner = "metric";
        const repo = "synthetica";
        const url = "https://webhook.atomist.com/atomist/github/teams/TMETRIC/brokensocialscene";
        let postedHook = false;
        const mock = new MockAdapter(axios);
        mock.onPost(/.*/).replyOnce(config => {
            const postData = JSON.parse(config.data);
            assert.equal(config.url, `https://api.github.com/repos/${owner}/${repo}/hooks`);
            assert(postData.active, "posted webhook data activates");
            assert.equal(postData.config.url, url);
            postedHook = true;
            return [201, {
                id: 1,
                url: `https://api.github.com/repos/${owner}/${repo}/hooks/1`,
                test_url: `https://api.github.com/repos/${owner}/${repo}/hooks/1/test`,
                ping_url: `https://api.github.com/repos/${owner}/${repo}/hooks/1/pings`,
                name: "web",
                events: ["*"],
                active: true,
                config: config.data.config,
                updated_at: "2017-12-06T20:39:23Z",
                created_at: "2017-12-06T17:26:27Z",
            }];
        });

        const params = new BaseSeedDrivenGeneratorParameters();
        params.source.owner = "atomist-seeds";
        params.source.repo = "spring-rest-seed";
        const target = params.target as GitHubRepoCreationParameters;
        target.owner = owner;
        target.repo = repo;
        (params.target as GitHubRepoCreationParameters).githubToken = "artificialnocturne";
        params.target.webhookUrl = url;
        params.addAtomistWebhook = true;

        const gen = generatorHandler(
            (pars, context) => (p, x, px) => Promise.resolve(p),
            BaseSeedDrivenGeneratorParameters,
            "AddWebhookTest",
            { projectPersister: mockProjectPersister },
        );

        let responseMessage: string;
        const ctx = {
            messageClient: {
                respond(msg: string): Promise<any> {
                    responseMessage = msg;
                    return Promise.resolve(msg);
                },
            },
            graphClient: {
                query(): Promise<any> {
                    return Promise.resolve(false);
                },
            },
        } as any as HandlerContext;

        const pp = gen.handle(ctx, params) as Promise<RedirectResult>;
        pp.then(r => {
            assert(r.code === 0, stringify(r));
            assert(postedHook, "posted Atomist webhook to api.github.com");
            assert(responseMessage === "Successfully created new project");
        }).then(() => done(), done);
    }).timeout(15000);

    it("does not add Atomist webhook to repo", done => {
        const owner = "metric";
        const repo = "synthetica";
        const url = "https://webhook.atomist.com/atomist/github/teams/TMETRIC/brokensocialscene";
        let postedHook = false;
        const mock = new MockAdapter(axios);
        mock.onPost(`https://api.github.com/repos/${owner}/${repo}/hooks`).replyOnce(config => {
            const postData = JSON.parse(config.data);
            postedHook = true;
            return [201, {
                id: 1,
                url: `https://api.github.com/repos/${owner}/${repo}/hooks/1`,
                test_url: `https://api.github.com/repos/${owner}/${repo}/hooks/1/test`,
                ping_url: `https://api.github.com/repos/${owner}/${repo}/hooks/1/pings`,
                name: "web",
                events: ["*"],
                active: true,
                config: config.data.config,
                updated_at: "2017-12-06T20:39:23Z",
                created_at: "2017-12-06T17:26:27Z",
            }];
        });

        const params = new BaseSeedDrivenGeneratorParameters();
        params.source.owner = "atomist-seeds";
        params.source.repo = "spring-rest-seed";
        const target = params.target as GitHubRepoCreationParameters;
        target.owner = owner;
        target.repo = repo;
        (params.target as GitHubRepoCreationParameters).githubToken = "artificialnocturne";
        params.target.webhookUrl = url;
        params.addAtomistWebhook = false;

        const gen = generatorHandler(
            (pars, context) => (p, x, px) => Promise.resolve(p),
            BaseSeedDrivenGeneratorParameters,
            "AddWebhookTest",
            { projectPersister: mockProjectPersister },
        );

        let responseMessage: string;
        const ctx = {
            messageClient: {
                respond(msg: string): Promise<any> {
                    responseMessage = msg;
                    return Promise.resolve(msg);
                },
            },
            graphClient: {
                query(): Promise<any> {
                    return Promise.resolve(false);
                },
            },
        } as any as HandlerContext;

        const pp = gen.handle(ctx, params) as Promise<RedirectResult>;
        pp.then(r => {
            assert(postedHook === false, "posted Atomist webhook when it should not have");
            assert(responseMessage === "Successfully created new project");
        }).then(() => done(), done);
    }).timeout(10000);

});
