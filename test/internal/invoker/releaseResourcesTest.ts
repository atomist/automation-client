import "mocha";
import * as assert from "power-assert";
import { addReleaseStep, callReleaseSteps, ResourceRecovery } from "../../../src/internal/invoker/resourceRecovery";

describe("releasing resources", () => {
    it("should happily release all the things", done => {
        const ctx: ResourceRecovery = {};

        let called: boolean = false;
        addReleaseStep(ctx, {
            how: () => {
                called = true;
                return Promise.resolve();
            },
            what: "set called to true",
        });

        callReleaseSteps(ctx)
            .then(() => {
                assert(called);
            })
            .then(() => done(), done);
    });

    it("should release resources even when some fail", done => {
        const ctx: ResourceRecovery = {};

        let called: boolean = false;
        addReleaseStep(ctx, {
            how: () => {
                return Promise.reject(new Error("this sucks"));
            }, what: "throw error",
        });
        addReleaseStep(ctx, {
            how: () => {
                called = true;
                return Promise.resolve();
            }, what: "set called to true",
        });

        callReleaseSteps(ctx)
            .then(() => {
                assert(called);
            })
            .then(() => done(), done);
    });

    it("should release resources even when some fail, reverse order", done => {
        const ctx: ResourceRecovery = {};

        let called: boolean = false;

        addReleaseStep(ctx, {
            how: () => {
                called = true;
                return Promise.resolve();
            }, what: "set called to true",
        });
        addReleaseStep(ctx, {
            how: () => {
                return Promise.reject(new Error("this sucks"));
            }, what: "throw error",
        });

        callReleaseSteps(ctx)
            .then(() => {
                assert(called);
            })
            .then(() => done(), done);
    });

    it("returns quickly when there are no steps", done => {
        const ctx: ResourceRecovery = {};

        callReleaseSteps(ctx)
            .then(() => done(), done);
    });
});
