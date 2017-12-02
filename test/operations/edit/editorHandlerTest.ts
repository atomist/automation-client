import "mocha";

import * as assert from "power-assert";
import { metadataFromInstance } from "../../../src/internal/metadata/metadataReading";
import { CommandHandlerMetadata } from "../../../src/metadata/automationMetadata";
import { fromListRepoFinder, fromListRepoLoader } from "../../../src/operations/common/fromProjectList";
import { AllReposByDefaultParameters } from "../../../src/operations/common/params/AllReposByDefaultParameters";
import { SimpleRepoId } from "../../../src/operations/common/RepoId";
import { editorHandler } from "../../../src/operations/edit/editorToCommand";
import { InMemoryProject } from "../../../src/project/mem/InMemoryProject";
import { BuildableAutomationServer } from "../../../src/server/BuildableAutomationServer";
import { VerifyEditMode } from "./VerifyEditMode";

describe("editorHandler", () => {

    it("should verify default no intent", () => {
        const h = editorHandler(() => p => Promise.resolve(p),
            AllReposByDefaultParameters,
            "editor");
        const chm = metadataFromInstance(h) as CommandHandlerMetadata;
        assert(!!chm.intent);
    });

    it("should verify specified intent", () => {
        const description = "custom description";
        const intent = "this is a very long intent to type";
        const h = editorHandler(() => p => Promise.resolve(p),
            AllReposByDefaultParameters,
            "editor", {
                description,
                intent,
            });
        const chm = metadataFromInstance(h) as CommandHandlerMetadata;
        assert(chm.description === description);
        assert.deepEqual(chm.intent, [intent]);
    });

    it("should register editor", done => {
        const h = editorHandler(() => p => Promise.resolve(p),
            AllReposByDefaultParameters,
            "editor");
        assert(metadataFromInstance(h).name === "editor");
        const s = new BuildableAutomationServer({name: "foobar", version: "1.0.0", teamIds: ["bar"], keywords: []});
        s.registerCommandHandler(() => h);
        done();
    });

    it("should use no op editor against no repos", done => {
        const h = editorHandler(params => {
                assert(!!params);
                assert(params.owner === "foo");
                return p => Promise.resolve(p);
            },
            AllReposByDefaultParameters,
            "editor", {
                repoFinder: fromListRepoFinder([]),
            });
        const s = new BuildableAutomationServer({name: "foobar", version: "1.0.0", teamIds: ["bar"], keywords: []});
        s.registerCommandHandler(() => h);
        s.invokeCommand({
            name: "editor",
            args: [{name: "slackTeam", value: "T1691"}, {name: "owner", value: "foo"}],
            secrets: [{name: "github://user_token?scopes=repo,user", value: "antechinus"}],
        }, {
            teamId: "T666",
            correlationId: "555",
            messageClient: null,
        })
            .then(_ => done(), done);
    });

    it("should use custom repo loader and verify result", done => {
        const proj = InMemoryProject.from(new SimpleRepoId("a", "b"));
        const h = editorHandler(params => {
                assert(!!params);
                assert(params.owner === "foo");
                return p => p.addFile("Thing", "1");
            },
            AllReposByDefaultParameters,
            "editor", {
                repoFinder: fromListRepoFinder([proj]),
                repoLoader: () => fromListRepoLoader([proj]),
                editMode: new VerifyEditMode(p => {
                    assert(p.findFileSync("Thing").getContentSync() === "1");
                }),
            });
        const s = new BuildableAutomationServer({name: "foobar", version: "1.0.0", teamIds: ["bar"], keywords: []});
        s.registerCommandHandler(() => h);
        s.invokeCommand({
            name: "editor",
            args: [{name: "slackTeam", value: "T1691"}, {name: "owner", value: "foo"}],
            secrets: [{name: "github://user_token?scopes=repo,user", value: "antechinus"}],
        }, {
            teamId: "T666",
            correlationId: "555",
            messageClient: null,
        })
            .then(_ => {
                assert(proj.findFileSync("Thing").getContentSync() === "1");
                done();
            }, done);
    });

});
