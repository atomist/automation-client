import "mocha";
import { Configuration } from "../../../src";
import { metadataFromInstance } from "../../../src/internal/metadata/metadataReading";

import * as assert from "power-assert";
import { populateValues } from "../../../src/internal/parameterPopulation";
import { EventHandlerMetadata } from "../../../src/metadata/automationMetadata";
import { HelloIssue } from "../../event/HelloIssue";

describe("class style event metadata reading", () => {

    it("should extract metadataFromInstance from event handler", () => {
        const h = new HelloIssue();
        const md = metadataFromInstance(h) as EventHandlerMetadata;
        assert(md.subscriptionName === "HelloIssue");

        const config: Configuration = {
            http: {
                port: 1111,
            },
        };

        populateValues(h, md, config);
        assert.equal(h.port, config.http.port);
    });

});
