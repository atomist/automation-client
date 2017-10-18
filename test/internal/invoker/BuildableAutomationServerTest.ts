import "mocha";
import * as assert from "power-assert";

import { consoleMessageClient } from "../../../src/internal/message/ConsoleMessageClient";
import { BuildableAutomationServer } from "../../../src/server/BuildableAutomationServer";
import { HelloIssue } from "../../event/HelloIssue";
import { AddAtomistSpringAgent, AlwaysOkEventHandler, FooBarEventHandler, FooBarIngestor } from "./TestHandlers";

const messageClient = consoleMessageClient;

describe("BuildableAutomationServer", () => {

    it("should start with no rugs", () => {
        const s = new BuildableAutomationServer({ name: "foobar", version: "1.0.0", teamIds: ["bar"], keywords: [] });
        assert(s.rugs.commands.length === 0);
        assert(s.rugs.events.length === 0);
    });

    it("should register one no-arg handler and return its metadataFromInstance", () => {
        const s = new BuildableAutomationServer({ name: "foobar", version: "1.0.0", teamIds: ["bar"], keywords: [] });
        s.withCommandHandler(
            { name: "foo", description: "foo", parameters: [], tags: [], intent: [], mapped_parameters: [] },
            ch => Promise.resolve({
                code: 0,
            }));
        assert(s.rugs.commands.length === 1);
        assert(s.rugs.events.length === 0);
        assert(s.rugs.commands[0].parameters.length === 0);
        assert(s.rugs.commands[0].name === "foo");
    });

    it("should register one single arg handler and return its metadataFromInstance", () => {
        const s = new BuildableAutomationServer({ name: "foobar", version: "1.0.0", teamIds: ["bar"], keywords: [] });
        s.withCommandHandler(
            {
                name: "foo", description: "foo", parameters: [{
                name: "one", description: "a thing", pattern: ".*", required: true,
            },
            ], tags: [], intent: [], mapped_parameters: [],
            },
            ch => Promise.resolve({
                code: 0,
            }));
        assert(s.rugs.commands.length === 1);
        assert(s.rugs.events.length === 0);
        assert(s.rugs.commands[0].parameters.length === 1);
        assert(s.rugs.commands[0].name === "foo");
    });

    it("should register one single arg handler and complain on invocation without parameter", () => {
        const s = new BuildableAutomationServer({ name: "foobar", version: "1.0.0", teamIds: ["bar"], keywords: [] });
        s.withCommandHandler(
            {
                name: "foo", description: "foo", parameters: [{
                name: "one", description: "a thing", pattern: ".*", required: true,
            },
            ], tags: [], intent: [], mapped_parameters: [],
            },
            ch => Promise.resolve({
                code: 0,
            }));
        assert.throws(() => {
            s.invokeCommand({
                name: "foo",
                args: [],
            }, {
                teamId: "T666",
                correlationId: "555",
                messageClient,
            });
        });
    });

    it("should register one single arg handler and not complain on invocation without defaulted parameter", (done) => {
        const s = new BuildableAutomationServer({ name: "foobar", version: "1.0.0", teamIds: ["bar"], keywords: [] });
        s.withCommandHandler(
            {
                name: "foo", description: "foo", parameters: [{
                name: "one", description: "a thing", pattern: ".*", required: true, default_value: "banana",
            },
            ], tags: [], intent: [], mapped_parameters: [],
            },
            ch => Promise.resolve({
                code: 0,
            }));
        s.invokeCommand({
            name: "foo",
            args: [],
        }, {
            teamId: "T666",
            correlationId: "555",
            messageClient,
        }).then(res => {
            assert(res.code === 0);
            done();
        });
    });

    it("should register one single arg handler and invoke with valid parameter", done => {
        const s = new BuildableAutomationServer({ name: "foobar", version: "1.0.0", teamIds: ["bar"], keywords: [] });
        let paramVal: string;
        s.withCommandHandler(
            {
                name: "foo", description: "foo", parameters: [{
                name: "one", description: "a thing", pattern: ".*", required: true,
            },
            ], tags: [], intent: [], mapped_parameters: [],
            },
            ch => {
                paramVal = ch.args[0].value;
                return Promise.resolve({
                    code: 0,
                });
            });

        s.invokeCommand({
            name: "foo",
            args: [{ name: "one", value: "value" }],
        }, {
            teamId: "T666",
            correlationId: "555",
            messageClient,
        }).then(_ => {
            assert(paramVal === "value");
            done();
        });
    });

    it("should register one command handler instance and invoke with valid parameter", done => {
        const s = new BuildableAutomationServer({ name: "foobar", version: "1.0.0", teamIds: ["bar"], keywords: [] });
        s.fromCommandHandlerInstance(() => new AddAtomistSpringAgent());
        s.invokeCommand({
            name: "AddAtomistSpringAgent",
            args: [{ name: "slackTeam", value: "T1691" }],
            secrets: [{ name: "atomist://some_secret", value: "some_secret" }],
        }, {
            teamId: "T666",
            correlationId: "555",
            messageClient,
        })
            .then(_ => done());
    });

    it("should register one event handler instance and invoke with valid parameter", done => {
        const s = new BuildableAutomationServer({ name: "foobar", version: "1.0.0", teamIds: ["bar"], keywords: [] });
        s.fromEventHandlerInstance(() => new AlwaysOkEventHandler());
        s.onEvent({
            extensions: {
                operationName: "Foo",
            },
            data: {
                Thing: [{
                    some_thing: 27,
                }],
            },
        }, {
            teamId: "T666",
            correlationId: "555",
            messageClient,
        }).then(_ => {
            assert((_[0] as any).thing === 27);
            done();
        });
    });

    it("should register two event handler instances and invoke with valid parameter", done => {
        const s = new BuildableAutomationServer({ name: "foobar", version: "1.0.0", teamIds: ["bar"], keywords: [] });
        s.fromEventHandlerInstance(() => new AlwaysOkEventHandler());
        s.fromEventHandlerInstance(() => new FooBarEventHandler());
        s.onEvent({
            extensions: {
                operationName: "Foo",
            },
            data: {
                Thing: [{
                    some_thing: 27,
                }],
            },
        }, {
            teamId: "T666",
            correlationId: "555",
            messageClient,
        }).then(_ => {
            assert((_[0] as any).thing === 27);
            assert((_[1] as any).thing === 28);
            done();
        });
    });

    it("should register one ingestor instance and invoke with valid payload", done => {
        const s = new BuildableAutomationServer({ name: "foobar", version: "1.0.0", teamIds: ["bar"], keywords: [] });
        s.fromIngestorInstance(() => new FooBarIngestor());
        s.onEvent({
            extensions: {
                operationName: "FooBarIngestor",
            },
            data: {
                some_thing: 27,
            },
        }, {
            teamId: "T666",
            correlationId: "555",
            messageClient,
        }).then(_ => {
            assert((_[0] as any).thing === 28);
            done();
        });
    });

    it("should register two ingestor instances and invoke with valid payload", done => {
        const s = new BuildableAutomationServer({ name: "foobar", version: "1.0.0", teamIds: ["bar"], keywords: [] });
        s.fromIngestorInstance(() => new FooBarIngestor());
        s.fromIngestorInstance(() => new HelloIssue());
        s.onEvent({
            extensions: {
                operationName: "FooBarIngestor",
            },
            data: {
                some_thing: 27,
            },
        }, {
            teamId: "T666",
            correlationId: "555",
            messageClient,
        }).then(_ => {
            assert((_[0] as any).thing === 28);
            done();
        });
    });

});
