import "mocha";
import * as assert from "power-assert";
import { HandlerContext } from "../../../lib/HandlerContext";
import {
    dispose,
    registerDisposable,
} from "../../../lib/internal/invoker/disposable";
import { guid } from "../../../lib/internal/util/string";

describe("disposing resources", () => {

    it("should happily release all the things", done => {
        const ctx: HandlerContext = {
            messageClient: undefined,
            workspaceId: "Txxxxxx",
            correlationId: guid(),
            invocationId: guid(),
        };
        ctx.lifecycle = {
            registerDisposable: registerDisposable(ctx),
            dispose: dispose(ctx),
        };

        let called: boolean = false;
        ctx.lifecycle.registerDisposable(() => {
            called = true;
            return Promise.resolve();
        },
            "set called to true",
        );

        ctx.lifecycle.dispose()
            .then(() => {
                assert(called);
            })
            .then(() => done(), done);
    });

    it("should release resources even when some fail", done => {
        const ctx: HandlerContext = {
            messageClient: undefined,
            workspaceId: "Txxxxxx",
            correlationId: guid(),
            invocationId: guid(),
        };
        ctx.lifecycle = {
            registerDisposable: registerDisposable(ctx),
            dispose: dispose(ctx),
        };

        let called: boolean = false;
        ctx.lifecycle.registerDisposable(
            () => {
                return Promise.reject(new Error("this sucks"));
            }, "throw error",
        );
        ctx.lifecycle.registerDisposable(() => {
            called = true;
            return Promise.resolve();
        }, "set called to true",
        );

        ctx.lifecycle.dispose()
            .then(() => {
                assert(called);
            })
            .then(() => done(), done);
    });

    it("should release resources even when some fail, reverse order", done => {
        const ctx: HandlerContext = {
            messageClient: undefined,
            workspaceId: "Txxxxxx",
            correlationId: guid(),
            invocationId: guid(),
        };
        ctx.lifecycle = {
            registerDisposable: registerDisposable(ctx),
            dispose: dispose(ctx),
        };

        let called: boolean = false;

        ctx.lifecycle.registerDisposable(() => {
            called = true;
            return Promise.resolve();
        }, "set called to true",
        );
        ctx.lifecycle.registerDisposable(() => {
            return Promise.reject(new Error("this sucks"));
        }, "throw error",
        );

        ctx.lifecycle.dispose()
            .then(() => {
                assert(called);
            })
            .then(() => done(), done);
    });

    it("returns quickly when there are no steps", done => {
        const ctx: HandlerContext = {
            messageClient: undefined,
            workspaceId: "Txxxxxx",
            correlationId: guid(),
            invocationId: guid(),
        };
        ctx.lifecycle = {
            registerDisposable: registerDisposable(ctx),
            dispose: dispose(ctx),
        };

        ctx.lifecycle.dispose()
            .then(() => done(), done);
    });
});
