import "mocha";
import * as assert from "power-assert";

import axios from "axios";
import MockAdapter = require("axios-mock-adapter");

import { successOn } from "../../../src/action/ActionResult";
import { HandleCommand } from "../../../src/HandleCommand";
import { HandlerContext } from "../../../src/HandlerContext";
import { RedirectResult } from "../../../src/HandlerResult";
import { SimpleRepoId } from "../../../src/operations/common/RepoId";
import { BaseSeedDrivenGeneratorParameters } from "../../../src/operations/generate/BaseSeedDrivenGeneratorParameters";
import { generatorHandler } from "../../../src/operations/generate/generatorToCommand";
import { InMemoryProject } from "../../../src/project/mem/InMemoryProject";
import { Project } from "../../../src/project/Project";
import { mockProjectPersister } from "./generatorUtilsTest";

describe("generatorToCommand", () => {

    it("adds Atomist webhook to repo", done => {
        const owner = "metric";
        const repo = "synthetica";
        const url = "https://webhook.atomist.com/atomist/github/teams/TMETRIC/brokensocialscene";
        let postedHook = false;
        const mock = new MockAdapter(axios);
        mock.onPost(`https://api.github.com/repos/${owner}/${repo}/hooks`).replyOnce(config => {
            const postData = JSON.parse(config.data);
            assert(postData.active === true, "posted webhook data activates");
            assert(postData.config.url === url);
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
        params.target.owner = owner;
        params.target.repo = repo;
        params.target.githubToken = "artificialnocturne";
        params.webhookUrl = url;
        params.addAtomistWebhook = true;

        const gen = generatorHandler({} as HandlerContext,
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
        } as HandlerContext;

        const pp = gen.handle(ctx, params) as Promise<RedirectResult>;
        pp.then(r => {
            assert(postedHook, "posted Atomist webhook to api.github.com");
            assert(responseMessage === "Successfully created new project");
        }).then(() => done(), done);
    });

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
        params.target.owner = owner;
        params.target.repo = repo;
        params.target.githubToken = "artificialnocturne";
        params.webhookUrl = url;
        params.addAtomistWebhook = false;

        const gen = generatorHandler({} as HandlerContext,
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
        } as HandlerContext;

        const pp = gen.handle(ctx, params) as Promise<RedirectResult>;
        pp.then(r => {
            assert(postedHook === false, "posted Atomist webhook when it should not have");
            assert(responseMessage === "Successfully created new project");
        }).then(() => done(), done);
    });

});
