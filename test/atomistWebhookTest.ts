/*
 * Copyright © 2018 Atomist, Inc.
 *
 * See LICENSE file.
 */

import "mocha";
import * as assert from "power-assert";

import axios from "axios";
import MockAdapter from "axios-mock-adapter";

import {
    AtomistWebhookType,
    postAtomistWebhook,
} from "../src/atomistWebhook";

describe("atomistWebhook", () => {

    const noRetryOptions = {
        retries: 0,
    };
    const fastRetryOptions = {
        retries: 1,
        factor: 2,
        minTimeout: 1,
        maxTimeout: 1,
        randomize: false,
    };

    describe("postAtomistWebhook", () => {

        const payload = {
            iron_and_wine: "Resurrection Fern",
            elliott_smith: "Bottle Up and Explode!",
            ti: "Live Your Life",
            my_morning_jacket: "One Big Holiday",
            the_replacements: "Alex Chilton",
        };
        const webhook: AtomistWebhookType = "build";
        const teamId = "T31110TT";
        const urlTail = `atomist/${webhook}/teams/${teamId}`;
        const url = `https://webhook.atomist.com/${urlTail}`;

        it("should successfully post", async () => {
            let posted = false;
            const mock = new MockAdapter(axios);
            mock.onPost(url, payload).replyOnce(config => {
                posted = true;
                return [200];
            });
            const res = await postAtomistWebhook(webhook, payload, teamId, noRetryOptions);
            assert.equal(res.status, 200);
            assert(posted, "webhook not posted");
        });

        it("should retry", async () => {
            let posted = false;
            const mock = new MockAdapter(axios);
            mock
                .onPost(url, payload).replyOnce(500)
                .onPost(url, payload).replyOnce(config => {
                    posted = true;
                    return [200];
                });
            const res = await postAtomistWebhook(webhook, payload, teamId, fastRetryOptions);
            assert.equal(res.status, 200);
            assert(posted, "webhook not posted");
        });

        it("should respect the ATOMIST_WEBHOOK_BASEURL environment variable", async () => {
            let posted = false;
            process.env.ATOMIST_WEBHOOK_BASEURL = "https://united-artists.com:1978";
            const envUrl = `${process.env.ATOMIST_WEBHOOK_BASEURL}/${urlTail}`;
            const mock = new MockAdapter(axios);
            mock.onPost(envUrl, payload).replyOnce(config => {
                posted = true;
                return [200];
            });
            const res = await postAtomistWebhook(webhook, payload, teamId, noRetryOptions);
            delete process.env.ATOMIST_WEBHOOK_BASEURL;
            assert.equal(res.status, 200);
            assert(posted, "webhook not posted");
        });

        it("should fail when looking for different payload", async () => {
            let posted = false;
            const mock = new MockAdapter(axios);
            mock.onPost(url, {}).replyOnce(config => {
                posted = true;
                return [200];
            });
            try {
                const res = await postAtomistWebhook(webhook, payload, teamId, noRetryOptions);
                assert.fail("should not have successfully posted wrong payload");
            } catch (e) {
                assert.equal(e.response.status, 404);
            }
        });

    });

});
