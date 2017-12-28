import "mocha";
import * as assert from "power-assert";
import { Automations } from "../../../../src/internal/metadata/metadata";
import { prepareRegistration } from "../../../../src/internal/transport/websocket/payloads";

describe("payloads", () => {

    it("check registration payload is valid", () => {
        const rugs: Automations = {
            name: "foo",
            version: "1.0.0",
            policy: "durable",
            events: [{
                name: "Foo",
                description: "Some event description",
                tags: [{ name: "bar", description: "bar" }],
                secrets: [{ name: "secret", uri: "atomist://secret2" }],
                subscription: "subscription FooSub{}",
                subscriptionName: "FooSub",
            }],
            commands: [{
                name: "Bar",
                tags: [{ name: "bar", description: "bar" }],
                intent: ["intent1"],
                secrets: [{ name: "secret", uri: "atomist://secret1" }],
                description: "Some command description",
                parameters: [{ name: "name", required: true }],
                mapped_parameters: [{ uri: "atomist://repo", name: "repo", required: true }],
            }],
            ingesters: [{
                name: "Foo",
                tags: [],
                description: "Some description",
                route: "foo",
            }],
            team_ids: ["x-team"],
            keywords: ["some keyword"],
        };

        const payload = prepareRegistration(rugs);

        console.log(JSON.stringify(payload, null, 2));

        assert(payload.api_version === "1");
        assert(payload.events, "there are events");
        assert(!payload.events[0].subscriptionName, "event does not have subscription name");
        assert(!payload.events[0].name, "event does not have name");
        assert(!payload.events[0].description, "event does not have description");
        assert(!payload.events[0].tags, "event does not have tags");
        assert(payload.events[0].subscription === "subscription FooSub{}", "event has subscription");
        assert(payload.events[0].secrets, "events have secrets");
        assert(payload.events[0].secrets[0].uri === "atomist://secret2", "event has a secret");
        assert(payload.commands[0].secrets, "commands have secrets");
        assert(payload.commands[0].secrets[0].uri === "atomist://secret1", "command has a secret");
        assert(payload.commands[0].auto_submit === false);

        assert(payload.name === "foo");
        assert(payload.version === "1.0.0");
        assert(payload.team_ids, "there are team ids");
        assert(payload.team_ids[0] === "x-team", "has a team id");
        assert(!payload.keywords);
        assert(payload.ingesters);
        assert(!payload.groups);

        assert.deepEqual(payload.policy, { name: "durable" });

        assert(payload.metadata.labels);
        assert(payload.metadata.labels["atomist.description"]);
        assert(payload.metadata.labels["atomist.author"]);
        assert(payload.metadata.labels["atomist.license"]);

        assert.deepEqual(payload.commands[0].tags, ["bar"]);
    });

    it("check registration for group = all is valid", () => {
        const rugs: Automations = {
            name: "foo",
            version: "1.0.0",
            policy: null,
            team_ids: [],
            groups: ["all"],
            commands: [],
            events: [],
            ingesters: [],
            keywords: [],
        };

        const payload = prepareRegistration(rugs);
        assert(!payload.team_ids);
        assert(payload.groups[0] = "all");
        assert.deepEqual(payload.policy, { name: "ephemeral" });
    });
});
