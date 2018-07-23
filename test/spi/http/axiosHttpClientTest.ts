/*
 * Copyright © 2018 Atomist, Inc.
 *
 * See LICENSE file.
 */

import * as http from "http";
import "mocha";
import * as os from "os";
import * as assert from "power-assert";
import { AxiosHttpClientFactory } from "../../../src/spi/http/axiosHttpClient";
import { HttpMethod } from "../../../src/spi/http/httpClient";

const hostname = os.hostname();

describe("axiosHttpClient", () => {

    let server;

    afterEach(() => {
        server.close();
    });

    it("should exchange simple get",  done => {
        server = http.createServer((req, res) => {
            assert.strictEqual(req.method, "GET");
            assert.strictEqual(req.url, "/foo/bar.html");
            res.writeHead(200, {"Content-Type": "text/plain"});
            res.end("foo and bar");
        }).listen(9999, hostname);

        setTimeout(async () => {
            const hcf = new AxiosHttpClientFactory();
            const hc = hcf.create(`http://${hostname}:9999/foo/bar.html`);

            const r = await hc.exchange(`http://${hostname}:9999/foo/bar.html`);
            assert.strictEqual(r.status, 200);
            assert.strictEqual(r.body, "foo and bar");
            done();
        }, 3000);

    }).timeout(10000);

    it("should exchange simple put",  done => {
        server = http.createServer((req, res) => {
            assert.strictEqual(req.method, "PUT");
            assert.strictEqual(req.url, "/foo");
            assert.strictEqual(req.headers["content-type"], "application/json");

            res.writeHead(201);
            res.end();
        }).listen(9999, hostname);

        setTimeout(async () => {
            const hcf = new AxiosHttpClientFactory();
            const hc = hcf.create(`http://${hostname}:9999/foo`);

            const r = await hc.exchange(`http://${hostname}:9999/foo`, {
                method: HttpMethod.Put,
                headers: {
                    "Content-Type": "application/json",
                },
                body: { blupp: "bla" },
            });
            assert.strictEqual(r.status, 201);
            done();
        }, 3000);
    }).timeout(10000);

    it("should exchange simple post with response", done => {
        server = http.createServer((req, res) => {
            assert.strictEqual(req.method, "POST");
            assert.strictEqual(req.url, "/foo");
            assert.strictEqual(req.headers["content-type"], "application/json");

            res.writeHead(201);
            res.end(JSON.stringify({ bla: "blupp" }));
        }).listen(9999, hostname);

        setTimeout(async () => {
            const hcf = new AxiosHttpClientFactory();
            const hc = hcf.create(`http://${hostname}:9999/foo`);

            const r = await hc.exchange(`http://${hostname}:9999/foo`, {
                method: HttpMethod.Post,
                headers: {
                    "Content-Type": "application/json",
                },
                body: { bla: "blupp" },
            });
            assert.strictEqual(r.status, 201);
            assert.deepEqual(r.body, { bla: "blupp" });
            done();
        }, 3000);
    }).timeout(10000);

});
