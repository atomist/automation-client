/*
 * Copyright © 2018 Atomist, Inc.
 *
 * See LICENSE file.
 */

// tslint:disable-next-line:import-blacklist
import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import * as http from "http";
import * as os from "os";
import * as assert from "power-assert";
import { AxiosHttpClientFactory } from "../../../lib/spi/http/axiosHttpClient";
import { HttpMethod } from "../../../lib/spi/http/httpClient";

describe("axiosHttpClient", () => {

    const noRetries = {
        retries: 0,
    };

    it("should exchange simple get", async () => {
        const url = "http://somewhere.com/foo/bar.html";
        const mock = new MockAdapter(axios);
        mock.onGet(url).replyOnce(200, "foo and bar");

        const hcf = new AxiosHttpClientFactory();
        const hc = hcf.create(url);

        const r = await hc.exchange(url, { retry: noRetries });
        assert.strictEqual(r.status, 200);
        assert.strictEqual(r.body, "foo and bar");
    });

    it("should exchange simple put", async () => {
        const url = "http://api.elsewhere.com/foo";
        const payload = { blupp: "bla" };
        let posted = false;
        const mock = new MockAdapter(axios);
        mock.onPut(url, payload).replyOnce(config => {
            posted = true;
            assert(config.headers["Content-Type"] === "application/json");
            return [201];
        });

        const hcf = new AxiosHttpClientFactory();
        const hc = hcf.create(url);

        const r = await hc.exchange(url, {
            method: HttpMethod.Put,
            headers: {
                "Content-Type": "application/json",
            },
            body: payload,
            retry: noRetries,
        });
        assert(posted);
        assert.strictEqual(r.status, 201);
    });

    it("should exchange simple post with response", async () => {
        const url = "http://api.nowhere.com/foo";
        const payload = { blupp: "bla" };
        let posted = false;
        const mock = new MockAdapter(axios);
        mock.onPost(url, payload).replyOnce(config => {
            posted = true;
            assert(config.headers["Content-Type"] === "application/json");
            return [201, config.data];
        });

        const hcf = new AxiosHttpClientFactory();
        const hc = hcf.create(url);

        const r = await hc.exchange(url, {
            method: HttpMethod.Post,
            headers: {
                "Content-Type": "application/json",
            },
            body: payload,
            retry: noRetries,
        });
        assert(posted);
        assert.strictEqual(r.status, 201);
        assert.deepStrictEqual(r.body, payload);
    });

});
