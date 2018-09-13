import "mocha";

import * as assert from "power-assert";
import { metadataFromInstance } from "../../../lib/internal/metadata/metadataReading";
import { CommandHandlerMetadata } from "../../../lib/metadata/automationMetadata";
import {
    fromListRepoFinder,
    fromListRepoLoader,
} from "../../../lib/operations/common/fromProjectList";
import { AlwaysAskRepoParameters } from "../../../lib/operations/common/params/AlwaysAskRepoParameters";
import { BaseEditorOrReviewerParameters } from "../../../lib/operations/common/params/BaseEditorOrReviewerParameters";
import { SimpleRepoId } from "../../../lib/operations/common/RepoId";
import { editorHandler } from "../../../lib/operations/edit/editorToCommand";
import { InMemoryProject } from "../../../lib/project/mem/InMemoryProject";
import { BuildableAutomationServer } from "../../../lib/server/BuildableAutomationServer";
import { VerifyEditMode } from "./VerifyEditMode";

describe("editorHandler", () => {

    it("should verify default no intent", () => {
        const h = editorHandler(() => p => Promise.resolve(p),
            BaseEditorOrReviewerParameters,
            "editor");
        const chm = metadataFromInstance(h) as CommandHandlerMetadata;
        assert(!!chm.intent);
    });

    it("should verify specified intent", () => {
        const description = "custom description";
        const intent = "this is a very long intent to type";
        const h = editorHandler(() => p => Promise.resolve(p),
            BaseEditorOrReviewerParameters,
            "editor", {
                description,
                intent,
            });
        const chm = metadataFromInstance(h) as CommandHandlerMetadata;
        assert(chm.description === description);
        assert.deepEqual(chm.intent, [intent]);
    });

    it("should register editor", () => {
        const h = editorHandler(() => p => Promise.resolve(p),
            BaseEditorOrReviewerParameters,
            "editor");
        assert(metadataFromInstance(h).name === "editor");
        const s = new BuildableAutomationServer({ name: "foobar", version: "1.0.0", workspaceIds: ["bar"], keywords: [] });
        s.registerCommandHandler(() => h);
    });

    it("should use no op editor against no repos", async () => {
        class MyParameters extends BaseEditorOrReviewerParameters {
            constructor() {
                super(new AlwaysAskRepoParameters());
                this.targets.owner = "foo";
                this.targets.repo = "thowijeoriweoirwe";
            }
        }
        const h = editorHandler(params => {
            assert(!!params);
            assert(params.targets.owner === "foo");
            return p => Promise.resolve(p);
        },
            MyParameters,
            "editor", {
                repoFinder: fromListRepoFinder([]),
            });
        const s = new BuildableAutomationServer({ name: "foobar", version: "1.0.0", workspaceIds: ["bar"], keywords: [] });
        s.registerCommandHandler(() => h);
        await s.invokeCommand({
            name: "editor",
            args: [{ name: "slackTeam", value: "T1691" }, { name: "owner", value: "foo" }],
            secrets: [{ uri: "github://user_token?scopes=repo,user:email,read:user", value: "antechinus" }],
        }, { workspaceId: "T666", correlationId: "555", messageClient: null });
    }).timeout(6000);

    it("should use custom repo loader and verify result", async () => {
        class MyParameters extends BaseEditorOrReviewerParameters {
            constructor() {
                super(new AlwaysAskRepoParameters());
                this.targets.repo = ".*";
                this.targets.owner = "foo";
            }
        }
        const proj = InMemoryProject.from(new SimpleRepoId("a", "b"));
        const h = editorHandler(params => {
            assert(!!params);
            assert(params.targets.owner === "foo");
            return p => p.addFile("Thing", "1");
        },
            MyParameters,
            "editor", {
                repoFinder: fromListRepoFinder([proj]),
                repoLoader: () => fromListRepoLoader([proj]),
                editMode: new VerifyEditMode(p => {
                    assert(p.findFileSync("Thing").getContentSync() === "1");
                }),
            });
        const s = new BuildableAutomationServer({ name: "foobar", version: "1.0.0", workspaceIds: ["bar"], keywords: [] });
        s.registerCommandHandler(() => h);
        await s.invokeCommand({
            name: "editor",
            args: [{ name: "slackTeam", value: "T1691" }, { name: "owner", value: "foo" }],
            secrets: [{ uri: "github://user_token?scopes=repo,user:email,read:user", value: "antechinus" }],
        }, { workspaceId: "T666", correlationId: "555", messageClient: null })
            .then(() => assert(proj.findFileSync("Thing").getContentSync() === "1"));
    });

});
