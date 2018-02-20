import "mocha";
import { metadataFromInstance } from "../../../src/internal/metadata/metadataReading";

import * as assert from "power-assert";
import { EventHandlerMetadata } from "../../../src/metadata/automationMetadata";
import { HelloIssue } from "../../event/HelloIssue";

describe("class style event metadata reading", () => {

    it("should extract metadataFromInstance from event handler", () => {
        const md = metadataFromInstance(new HelloIssue()) as EventHandlerMetadata;
        assert(md.subscriptionName === "HelloIssue");
    });

});
