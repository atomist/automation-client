import * as assert from "power-assert";

import {
    ActionResult,
    successOn,
} from "../../../lib/action/ActionResult";
import { ProjectOperationCredentials } from "../../../lib/operations/common/ProjectOperationCredentials";
import {
    RepoId,
    SimpleRepoId,
} from "../../../lib/operations/common/RepoId";
import { BaseSeedDrivenGeneratorParameters } from "../../../lib/operations/generate/BaseSeedDrivenGeneratorParameters";
import {
    generate,
    ProjectPersister,
} from "../../../lib/operations/generate/generatorUtils";
import { InMemoryProject } from "../../../lib/project/mem/InMemoryProject";
import { Project } from "../../../lib/project/Project";

export const mockProjectPersister: ProjectPersister<Project, ActionResult<Project>> =
    (p: Project, c: ProjectOperationCredentials, t: RepoId) => {
        if (p.id) {
            p.id.owner = t.owner;
            p.id.repo = t.repo;
        } else {
            p.id = {
                owner: t.owner,
                repo: t.repo,
                url: "",
            };
        }
        return Promise.resolve(successOn(p));
    };

describe("generatorUtils", () => {

    it("succeeds with no op editor and empty project", async () => {
        await generate(InMemoryProject.of(),
            null, null,
            p => Promise.resolve(p),
            mockProjectPersister,
            new SimpleRepoId("foo", "bar"),
        );
    });

    it("passes parameters", async () => {
        const params = new BaseSeedDrivenGeneratorParameters();
        await generate(InMemoryProject.of(),
            null, null,
            (p, ctx, parms) => {
                assert(parms === params);
                return Promise.resolve(p);
            },
            mockProjectPersister,
            new SimpleRepoId("foo", "bar"),
            params,
        );
    });

    it("sees correct target repo id", async () => {
        const params = new BaseSeedDrivenGeneratorParameters();
        await generate(InMemoryProject.of(),
            null, null,
            (p, ctx, parms) => {
                assert(parms === params);
                assert.strictEqual(p.id.owner, "foo");
                assert.strictEqual(p.id.repo, "bar");
                return Promise.resolve(p);
            },
            mockProjectPersister,
            new SimpleRepoId("foo", "bar"),
            params,
        );
    });

    it("invokes after action", done => {
        const thingToReturn = { what: "isthis" };
        const params = new BaseSeedDrivenGeneratorParameters();
        generate(InMemoryProject.of(),
            null, null,
            p => Promise.resolve(p),
            mockProjectPersister,
            new SimpleRepoId("foo", "bar"),
            params,
            (p, parms) => {
                assert(parms === params);
                return Promise.resolve({
                    target: p,
                    success: true,
                    thingToReturn,
                });
            },
        )
            .then(r => {
                assert((r as any).thingToReturn === thingToReturn);
            }).then(done, done);
    });

    it("preserves persist extra data", done => {
        generate(InMemoryProject.of(),
            null, null,
            p => Promise.resolve(p),
            p => Promise.resolve({
                target: p,
                success: true,
                extraThing: true,
            }),
            new SimpleRepoId("foo", "bar"),
            undefined,
            p => Promise.resolve({
                target: p,
                success: true,
            }),
        )
            .then(r => {
                assert((r as any).extraThing === true);
            }).then(done, done);
    });

    it("preserves persist extra data after after action", done => {
        const thingToReturn = { what: "isthis" };
        generate(InMemoryProject.of(),
            null, null,
            p => Promise.resolve(p),
            p => Promise.resolve({
                target: p,
                success: true,
                extraThing: true,
            }),
            new SimpleRepoId("foo", "bar"),
            undefined,
            p => Promise.resolve({
                target: p,
                success: true,
                thingToReturn,
            }),
        )
            .then(r => {
                assert((r as any).extraThing === true);
                assert((r as any).thingToReturn === thingToReturn);
            }).then(done, done);
    });

});
