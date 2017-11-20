import "mocha";
import * as assert from "power-assert";

import { CommandHandler, Parameter } from "../../../src/decorators";
import { SelfDescribingHandleCommand } from "../../../src/HandleCommand";
import { consoleMessageClient } from "../../../src/internal/message/ConsoleMessageClient";
import { succeed } from "../../../src/operations/support/contextUtils";
import { AutomationServer } from "../../../src/server/AutomationServer";
import { BuildableAutomationServer } from "../../../src/server/BuildableAutomationServer";
import { SecretResolver } from "../../../src/spi/env/SecretResolver";
import {
    AddAtomistSpringAgent, AlwaysOkEventHandler, FooBarEventHandler, TrustMeIGaveMySecret,
} from "./TestHandlers";

const messageClient = consoleMessageClient;

describe("BuildableAutomationServer", () => {

    it("should start with no automations", () => {
        const s = new BuildableAutomationServer({name: "foobar", version: "1.0.0", teamIds: ["bar"], keywords: []});
        assert(s.automations.commands.length === 0);
        assert(s.automations.events.length === 0);
    });

    it("should register one no-arg handler and return its metadataFromInstance", () => {
        const s = new BuildableAutomationServer({name: "foobar", version: "1.0.0", teamIds: ["bar"], keywords: []});
        const h: SelfDescribingHandleCommand = {
            name: "foo", description: "foo", parameters: [], tags: [], intent: [], mapped_parameters: [],
            handle: succeed,
        };
        s.registerCommandHandler(() => h);
        assert(s.automations.commands.length === 1);
        assert(s.automations.events.length === 0);
        assert(s.automations.commands[0].parameters.length === 0);
        assert(s.automations.commands[0].name === "foo");
    });

    it("should register one single arg handler and return its metadataFromInstance", () => {
        const s = new BuildableAutomationServer({name: "foobar", version: "1.0.0", teamIds: ["bar"], keywords: []});
        const h: SelfDescribingHandleCommand = {
            name: "foo", description: "foo", parameters: [{
                name: "one", description: "a thing", pattern: ".*", required: true,
            },
            ], tags: [], intent: [], mapped_parameters: [],
            handle: succeed,
        };
        s.registerCommandHandler(() => h);
        assert(s.automations.commands.length === 1);
        assert(s.automations.events.length === 0);
        assert(s.automations.commands[0].parameters.length === 1);
        assert(s.automations.commands[0].name === "foo");
    });

    it("should register one single arg handler and complain on invocation without parameter", () => {
        const s = new BuildableAutomationServer({name: "foobar", version: "1.0.0", teamIds: ["bar"], keywords: []});
        const h: SelfDescribingHandleCommand = {
            name: "foo", description: "foo", parameters: [{
                name: "one", description: "a thing", pattern: ".*", required: true,
            },
            ], tags: [], intent: [], mapped_parameters: [],
            handle: succeed,
        };
        s.registerCommandHandler(() => h);
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

    it("should register one single arg handler and not complain on invocation without defaulted parameter", done => {
        const s = new BuildableAutomationServer({name: "foobar", version: "1.0.0", teamIds: ["bar"], keywords: []});
        const h: SelfDescribingHandleCommand = {
            name: "foo", description: "foo", parameters: [{
                name: "one", description: "a thing", pattern: ".*", required: true, default_value: "banana",
            },
            ], tags: [], intent: [], mapped_parameters: [],
            handle: succeed,
        };
        s.registerCommandHandler(() => h);
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
        const s = new BuildableAutomationServer({name: "foobar", version: "1.0.0", teamIds: ["bar"], keywords: []});
        const h: SelfDescribingHandleCommand = {
            name: "foo", description: "foo", parameters: [{
                name: "one", description: "a thing", pattern: ".*", required: true,
            },
            ], tags: [], intent: [], mapped_parameters: [],
            handle: (ch, params) => {
                return Promise.resolve({
                    code: 0,
                    paramVal: (params as any).one,
                });
            },
        };
        s.registerCommandHandler(() => h);
        registerOneSingleArgHandlerAndInvokeWithValidParameter(s, done);
    });

    function registerOneSingleArgHandlerAndInvokeWithValidParameter(s: AutomationServer, done) {
        s.invokeCommand({
            name: "foo",
            args: [{name: "one", value: "value"}],
        }, {
            teamId: "T666",
            correlationId: "555",
            messageClient,
        }).then(hr => {
            assert((hr as any).paramVal === "value");
            done();
        }).catch(done);
    }

    it("should register one command handler instance and invoke with valid parameter", done => {
        const s = new BuildableAutomationServer({name: "foobar", version: "1.0.0", teamIds: ["bar"], keywords: []});
        s.registerCommandHandler(AddAtomistSpringAgent);
        s.invokeCommand({
            name: "AddAtomistSpringAgent",
            args: [{name: "slackTeam", value: "T1691"}],
            secrets: [{name: "atomist://some_secret", value: "some_secret"}],
        }, {
            teamId: "T666",
            correlationId: "555",
            messageClient,
        })
            .then(_ => done());
    });

    it("should register one event handler instance and invoke with valid event data", done => {
        const s = new BuildableAutomationServer({name: "foobar", version: "1.0.0", teamIds: ["bar"], keywords: []});
        s.registerEventHandler(AlwaysOkEventHandler);
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

    it("should register one event handler instance and access secret through params", done => {
        const sr: SecretResolver = {
            resolve(sec: string) {
                assert(sec === "github://org_token");
                return "valid";
            },
        };
        const s = new BuildableAutomationServer(
            {name: "foobar", version: "1.0.0", teamIds: ["bar"], keywords: []},
            sr);
        s.registerEventHandler(TrustMeIGaveMySecret);
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
        const s = new BuildableAutomationServer({name: "foobar", version: "1.0.0", teamIds: ["bar"], keywords: []});
        s.registerEventHandler(() => new AlwaysOkEventHandler());
        s.registerEventHandler(() => new FooBarEventHandler());
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

    it("should register one single arg handler using nested parameters and invoke with valid parameter", done => {
        const s = new BuildableAutomationServer({name: "foobar", version: "1.0.0", teamIds: ["bar"], keywords: []});
        class Params {
            @Parameter()
            public one: string;
        }

        @CommandHandler("goo bar")
        class Handler {
            public nested = new Params();

            public handle(ch, params) {
                return Promise.resolve({
                    code: 0,
                    paramVal: params.nested.one,
                });
            }
        }

        s.registerCommandHandler(Handler);
        registerOneSingleArgHandlerAndInvokeWithValidNestedParameter(s, done);
    });

    function registerOneSingleArgHandlerAndInvokeWithValidNestedParameter(s: AutomationServer, done) {
        s.invokeCommand({
            name: "Handler",
            args: [{name: "nested.one", value: "value"}],
        }, {
            teamId: "T666",
            correlationId: "555",
            messageClient,
        }).then(hr => {
            assert((hr as any).paramVal === "value");
            done();
        }).catch(done);
    }
});
