import "mocha";
import * as assert from "power-assert";
import { Rugs } from "../../../../src/internal/metadata/metadata";
import { prepareRegistration } from "../../../../src/internal/transport/websocket/payloads";

describe("payloads", () => {

    it("check registration payload is valid", () => {
        const rugs: Rugs = {
            name: "foo",
            version: "1.0.0",
            events: [{
                name: "Foo",
                description: "Some event description",
                tags: [{ name: "bar", description: "bar" }],
                secrets: [{ name: "secret", path: "atomist://secret2" }],
                subscription: "subscription FooSub{}",
                subscriptionName: "FooSub",
            }],
            commands: [{
                name: "Bar",
                tags: [{ name: "bar", description: "bar" }],
                intent: ["intent1"],
                secrets: [{ name: "secret", path: "atomist://secret1" }],
                description: "Some command description",
                parameters: [{ name: "name", required: true }],
                mapped_parameters: [{ foreign_key: "atomist://repo", local_key: "repo" }],
            }],
            ingestors: [{
                name: "Foo",
                tags: [],
                description: "Some description",
                route: "foo",
            }],
            team_ids: ["x-team"],
            keywords: ["some keyword"],
        };

        const payload = prepareRegistration(rugs);
        assert(payload.events, "there are events");
        assert(!payload.events[0].subscriptionName, "event does not have subscription name");
        assert(!payload.events[0].name, "event does not have name");
        assert(!payload.events[0].description, "event does not have description");
        assert(!payload.events[0].tags, "event does not have tags");
        assert(payload.events[0].subscription === "subscription FooSub{}", "event has subscription");
        assert(payload.events[0].secrets, "events have secrets");
        assert(payload.events[0].secrets[0] === "atomist://secret2", "event has a secret");
        assert(payload.commands[0].secrets, "commands have secrets");
        assert(payload.commands[0].secrets[0] === "atomist://secret1", "command has a secret");

        assert(payload.name === "foo");
        assert(payload.version === "1.0.0");
        assert(payload.team_ids, "there are team ids");
        assert(payload.team_ids[0] === "x-team", "has a team id");
        assert(!payload.keywords);
        assert(!payload.ingestors);
    });

    it("check registration for group = all is valid", () => {
        const rugs: Rugs = {
            name: "foo",
            version: "1.0.0",
            team_ids: [],
            commands: [],
            events: [],
            ingestors: [],
            keywords: [],
        };

        const payload = prepareRegistration(rugs);
        assert(!payload.team_ids);
        assert(payload.groups[0] = "all");
    });
});
