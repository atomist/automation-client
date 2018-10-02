/*
 * Copyright © 2018 Atomist, Inc.
 *
 * See LICENSE file.
 */

import * as http from "http";
import "mocha";
import * as assert from "power-assert";
import { CurlHttpClientFactory } from "../../../lib/spi/http/curlHttpClient";
import { HttpMethod } from "../../../lib/spi/http/httpClient";

describe("curlHttpClient", () => {

    let server;

    afterEach(() => {
        server.close();
    });

    const noRetries = {
        retries: 0,
    };

    const hostname = "localhost";

    it("should exchange simple get", async () => {
        server = http.createServer((req, res) => {
            assert.strictEqual(req.method, "GET");
            assert.strictEqual(req.url, "/foo/bar.html");
            res.writeHead(200, { "Content-Type": "text/plain" });
            res.end("foo and bar");
        }).listen(9999, hostname);

        const hcf = new CurlHttpClientFactory();
        const hc = hcf.create(`http://${hostname}:9999/foo`);

        const r = await hc.exchange(`http://${hostname}:9999/foo/bar.html`, { retry: noRetries });
        assert.strictEqual(r.status, 200);
        assert.strictEqual(r.body, "foo and bar");
    });

    it("should exchange simple put", async () => {
        server = http.createServer((req, res) => {
            assert.strictEqual(req.method, "PUT");
            assert.strictEqual(req.url, "/foo");
            assert.strictEqual(req.headers["content-type"], "application/json");

            res.writeHead(201);
            res.end();
        }).listen(9999, hostname);

        const hcf = new CurlHttpClientFactory();
        const hc = hcf.create(`http://${hostname}:9999/foo`);

        const r = await hc.exchange(`http://${hostname}:9999/foo`, {
            method: HttpMethod.Put,
            headers: {
                "Content-Type": "application/json",
            },
            body: { blupp: "bla" },
            retry: noRetries,
        });
        assert.strictEqual(r.status, 201);
    });

    it("should exchange simple post with response", async () => {
        server = http.createServer((req, res) => {
            assert.strictEqual(req.method, "POST");
            assert.strictEqual(req.url, "/foo");
            assert.strictEqual(req.headers["content-type"], "application/json");

            res.writeHead(201);
            res.end(JSON.stringify({ bla: "blupp" }));
        }).listen(9999, hostname);

        const hcf = new CurlHttpClientFactory();
        const hc = hcf.create(`http://${hostname}:9999/foo`);

        const r = await hc.exchange(`http://${hostname}:9999/foo`, {
            method: HttpMethod.Post,
            headers: {
                "Content-Type": "application/json",
            },
            body: { bla: "blupp" },
            retry: noRetries,
        });
        assert.strictEqual(r.status, 201);
        assert.deepEqual(r.body, { bla: "blupp" });
    });

});
