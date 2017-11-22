import "mocha";

import * as assert from "power-assert";
import { metadataFromInstance } from "../../../src/internal/metadata/metadataReading";
import { fromListRepoFinder } from "../../../src/operations/common/fromProjectList";
import { BaseEditorParameters } from "../../../src/operations/edit/BaseEditorParameters";
import { editorHandler } from "../../../src/operations/edit/editorToCommand";
import { BuildableAutomationServer } from "../../../src/server/BuildableAutomationServer";

describe("editorHandler", () => {

    it("should register editor", done => {
        const h = editorHandler(p => Promise.resolve(p),
            BaseEditorParameters,
            "editor");
        assert(metadataFromInstance(h).name === "editor");
        const s = new BuildableAutomationServer({name: "foobar", version: "1.0.0", teamIds: ["bar"], keywords: []});
        s.registerCommandHandler(() => h);
        done();
    });

    it("should use no op editor against no repos", done => {
        const h = editorHandler(p => Promise.resolve(p),
            BaseEditorParameters,
            "editor", {
                repoFinder: fromListRepoFinder([]),
            });
        const s = new BuildableAutomationServer({name: "foobar", version: "1.0.0", teamIds: ["bar"], keywords: []});
        s.registerCommandHandler(() => h);
        done();
        s.invokeCommand({
            name: "editor",
            args: [{name: "slackTeam", value: "T1691"}],
            secrets: [{name: "atomist://some_secret", value: "some_secret"}],
        }, {
            teamId: "T666",
            correlationId: "555",
            messageClient: null,
        })
            .then(_ => done());
    });

});
