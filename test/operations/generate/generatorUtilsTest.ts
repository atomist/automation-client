import "mocha";
import * as assert from "power-assert";

import { ActionResult, successOn } from "../../../src/action/ActionResult";
import { ProjectOperationCredentials } from "../../../src/operations/common/ProjectOperationCredentials";
import { RepoId, SimpleRepoId } from "../../../src/operations/common/RepoId";
import { BaseSeedDrivenGeneratorParameters } from "../../../src/operations/generate/BaseSeedDrivenGeneratorParameters";
import { generate, ProjectPersister } from "../../../src/operations/generate/generatorUtils";
import { InMemoryProject } from "../../../src/project/mem/InMemoryProject";
import { Project } from "../../../src/project/Project";

export const mockProjectPersister: ProjectPersister<Project, ActionResult<Project>> =
    (p: Project, c: ProjectOperationCredentials, t: RepoId) => {
        if (p.id) {
            p.id.owner = t.owner;
            p.id.repo = t.repo;
        } else {
            p.id = {
                owner: t.owner,
                repo: t.repo,
            };
        }
        return Promise.resolve(successOn(p));
    };

describe("generatorUtils", () => {

    it("succeeds with no op editor and empty project", done => {
        generate(InMemoryProject.of(),
            null, null,
            p => Promise.resolve(p),
            mockProjectPersister,
            new SimpleRepoId("foo", "bar"),
        )
            .then(() => done(), done);
    });

    it("passes parameters", done => {
        const params = new BaseSeedDrivenGeneratorParameters();
        generate(InMemoryProject.of(),
            null, null,
            (p, ctx, parms) => {
                assert(parms === params);
                return Promise.resolve(p);
            },
            mockProjectPersister,
            new SimpleRepoId("foo", "bar"),
            params,
        )
            .then(() => done(), done);
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
            }).then(() => done(), done);
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
            }).then(() => done(), done);
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
            }).then(() => done(), done);
    });

});
