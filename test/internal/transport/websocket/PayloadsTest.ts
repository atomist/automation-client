import "mocha";
import * as assert from "power-assert";
import { Rugs } from "../../../../src/internal/metadata/metadata";
import { prepareRegistration } from "../../../../src/internal/transport/websocket/Payloads";

describe("Payloads", () => {

    it("check registration payload is valid", () => {
        const rugs: Rugs = {
            name: "foo",
            version: "1.0.0",
            events: [{
                name: "Foo",
                description: "Some event description",
                tags: [{name: "bar", description: "bar" }],
                secrets: [{name: "secret", path: "atomist://secret2"}],
                subscription: "subscription FooSub{}",
                subscriptionName: "FooSub",
            }],
            commands: [{
                name: "Bar",
                tags: [{name: "bar", description: "bar" }],
                intent: ["intent1"],
                secrets: [{ name: "secret", path: "atomist://secret1"}],
                description: "Some command description",
                parameters: [{ name: "name", required: true }],
                mapped_parameters: [{ foreign_key: "atomist://repo", local_key: "repo"}],
            }],
            ingestors: [{
                name: "Foo",
                tags: [],
                description: "Some description",
                route: "foo",
            }],
            team_id: "x-team",
            keywords: ["some keyword"],
        };

        const payload = prepareRegistration(rugs);
        assert(!payload.events[0].subscriptionName);
        assert(!payload.events[0].name);
        assert(!payload.events[0].description);
        assert(!payload.events[0].tags);
        assert(payload.events[0].subscription === "subscription FooSub{}");
        assert(payload.events[0].secrets[0] === "atomist://secret2");
        assert(payload.commands[0].secrets[0] === "atomist://secret1");

        assert(payload.name === "foo");
        assert(payload.version === "1.0.0");
        assert(payload.team_id === "x-team");
        assert(!payload.keywords);
        assert(!payload.ingestors);
    });
});
