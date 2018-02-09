import stringify = require("json-stringify-safe");
import "mocha";
import * as assert from "power-assert";
import { CommandHandler, MappedParameter, Parameter, Parameters, Secret } from "../../../src/decorators";
import { HandleCommand, SelfDescribingHandleCommand } from "../../../src/HandleCommand";
import { consoleMessageClient } from "../../../src/internal/message/ConsoleMessageClient";
import { succeed } from "../../../src/operations/support/contextUtils";
import { AutomationServer } from "../../../src/server/AutomationServer";
import { BuildableAutomationServer } from "../../../src/server/BuildableAutomationServer";
import { SmartParameters } from "../../../src/SmartParameters";
import { SecretResolver } from "../../../src/spi/env/SecretResolver";
import { HelloWorld } from "../../command/HelloWorld";
import { AddAtomistSpringAgent, AlwaysOkEventHandler, FooBarEventHandler, TrustMeIGaveMySecret } from "./TestHandlers";

const messageClient = consoleMessageClient;

describe("BuildableAutomationServer", () => {

    it("should start with no automations", () => {
        const s = new BuildableAutomationServer({ name: "foobar", version: "1.0.0", teamIds: ["bar"], keywords: [] });
        assert(s.automations.commands.length === 0);
        assert(s.automations.events.length === 0);
    });

    it("should register one no-arg handler and return its metadataFromInstance", () => {
        const s = new BuildableAutomationServer({ name: "foobar", version: "1.0.0", teamIds: ["bar"], keywords: [] });
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
        const s = new BuildableAutomationServer({ name: "foobar", version: "1.0.0", teamIds: ["bar"], keywords: [] });
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
        const s = new BuildableAutomationServer({ name: "foobar", version: "1.0.0", teamIds: ["bar"], keywords: [] });
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
        const s = new BuildableAutomationServer({ name: "foobar", version: "1.0.0", teamIds: ["bar"], keywords: [] });
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
        const s = new BuildableAutomationServer({ name: "foobar", version: "1.0.0", teamIds: ["bar"], keywords: [] });
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
            args: [{ name: "one", value: "value" }],
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
        const s = new BuildableAutomationServer({ name: "foobar", version: "1.0.0", teamIds: ["bar"], keywords: [] });
        s.registerCommandHandler(AddAtomistSpringAgent);
        s.invokeCommand({
            name: "AddAtomistSpringAgent",
            args: [{ name: "slackTeam", value: "T1691" }],
            secrets: [{ uri: "atomist://some_secret", value: "some_secret" }],
        }, {
                teamId: "T666",
                correlationId: "555",
                messageClient,
            })
            .then(_ => done());
    });

    it("should register one event handler instance and invoke with valid event data", done => {
        const s = new BuildableAutomationServer({ name: "foobar", version: "1.0.0", teamIds: ["bar"], keywords: [] });
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
            { name: "foobar", version: "1.0.0", teamIds: ["bar"], keywords: [] },
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
        const s = new BuildableAutomationServer({ name: "foobar", version: "1.0.0", teamIds: ["bar"], keywords: [] });
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
        const s = new BuildableAutomationServer({ name: "foobar", version: "1.0.0", teamIds: ["bar"], keywords: [] });

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
        s.invokeCommand({
            name: "Handler",
            args: [{ name: "nested.one", value: "value" }],
        }, {
                teamId: "T666",
                correlationId: "555",
                messageClient,
            }).then(hr => {
                assert((hr as any).paramVal === "value");
                done();
            }).catch(done);
    });

    it("should register single arg handler using nested mapped parameters and invoke with valid parameter", done =>
        mappedParameterTest(done, true));

    it("should register single arg handler using nested optional mapped parameters and invoke with valid parameter", done =>
        mappedParameterTest(done, false));

    function mappedParameterTest(done: any, required: boolean) {
        const s = new BuildableAutomationServer({ name: "foobar", version: "1.0.0", teamIds: ["bar"], keywords: [] });

        class Params {
            @Parameter()
            public one: string;
            @MappedParameter("fk", required)
            public mapped: string = "should_be_overwitten";
        }

        @CommandHandler("goo bar")
        class Handler {
            public nested = new Params();

            public handle(ch, params) {
                return Promise.resolve({
                    code: 0,
                    paramVal: params.nested.one,
                    mappedVal: params.nested.mapped,
                });
            }
        }

        s.registerCommandHandler(Handler);
        s.invokeCommand({
            name: "Handler",
            args: [{ name: "nested.one", value: "value" }],
            mappedParameters: [{ name: "nested.mapped", value: "resolved" }],
        }, {
                teamId: "T666",
                correlationId: "555",
                messageClient,
            }).then(hr => {
                assert((hr as any).mappedVal === "resolved", stringify(hr, null, 2));
                done();
            }).catch(done);
    }

    it("should register single arg handler using nested optional mapped parameters and invoke with valid parameter", done => {
        const s = new BuildableAutomationServer({ name: "foobar", version: "1.0.0", teamIds: ["bar"], keywords: [] });

        class Params {
            @Parameter()
            public one: string;
            @MappedParameter("fk", false)
            public mapped: string = "should_not_be_overwitten";
        }

        @CommandHandler("goo bar")
        class Handler {
            public nested = new Params();

            public handle(ch, params) {
                return Promise.resolve({
                    code: 0,
                    paramVal: params.nested.one,
                    mappedVal: params.nested.mapped,
                });
            }
        }

        s.registerCommandHandler(Handler);
        s.invokeCommand({
            name: "Handler",
            args: [{ name: "nested.one", value: "value" }],
            mappedParameters: [],
        }, {
                teamId: "T666",
                correlationId: "555",
                messageClient,
            }).then(hr => {
                assert((hr as any).mappedVal === "should_not_be_overwitten", stringify(hr, null, 2));
                done();
            }).catch(done);
    });

    it("should register single arg handler using nested secrets and invoke with valid parameter", done => {
        const s = new BuildableAutomationServer({ name: "foobar", version: "1.0.0", teamIds: ["bar"], keywords: [] });

        class Params {
            @Parameter()
            public one: string;
            @Secret("pathOfMySecret")
            public mySecret: string = "should_be_overwitten";
        }

        @CommandHandler("goo bar")
        class Handler {
            public nested = new Params();

            public handle(ch, params) {
                return Promise.resolve({
                    code: 0,
                    paramVal: params.nested.one,
                    mappedVal: params.nested.mySecret,
                });
            }
        }

        s.registerCommandHandler(Handler);
        s.invokeCommand({
            name: "Handler",
            args: [{ name: "nested.one", value: "value" }],
            secrets: [{ uri: "pathOfMySecret", value: "resolved" }],
        }, {
                teamId: "T666",
                correlationId: "555",
                messageClient,
            }).then(hr => {
                assert((hr as any).mappedVal === "resolved", stringify(hr, null, 2));
                done();
            }).catch(done);
    });

    it("should fail parameter validation", done => {
        const s = new BuildableAutomationServer({ name: "foobar", version: "1.0.0", teamIds: ["bar"], keywords: [] });

        class Params {
            @Parameter({ required: true })
            public isSmart: string;
            @Secret("pathOfMySecret")
            public mySecret: string = "should_be_overwitten";
        }

        @CommandHandler("goo bar")
        class Handler implements SmartParameters {
            public nested = new Params();

            public bindAndValidate() {
                return { message: "The sploshing flange is invalid" };
            }

            public handle(ch, params) {
                return Promise.resolve({
                    code: 0,
                    mappedVal: params.nested.mySecret,
                });
            }
        }

        s.registerCommandHandler(Handler);
        s.invokeCommand({
            name: "Handler",
            args: [{ name: "nested.isSmart", value: "value" }],
            secrets: [{ uri: "pathOfMySecret", value: "resolved" }],
        }, {
                teamId: "T666",
                correlationId: "555",
                messageClient,
            })
            .then(ok => {
                done(new Error("Should have failed validation"));
            },
            err => {
                assert(err.includes("sploshing flange"));
                done();
            });
    });

    it("should use bind call to compute property", done => {
        const s = new BuildableAutomationServer({ name: "foobar", version: "1.0.0", teamIds: ["bar"], keywords: [] });

        class Params {
            @Parameter({ required: true })
            public isSmart: string;
            @Secret("pathOfMySecret")
            public mySecret: string = "should_be_overwitten";
        }

        @CommandHandler("goo bar")
        class Handler implements SmartParameters {
            public nested = new Params();
            private additional = "should_be_overwritten";

            public bindAndValidate() {
                this.additional = this.nested.isSmart;
            }

            public handle(ch, params) {
                return Promise.resolve({
                    code: 0,
                    computed: params.additional,
                });
            }
        }

        s.registerCommandHandler(Handler);
        s.invokeCommand({
            name: "Handler",
            args: [{ name: "nested.isSmart", value: "value" }],
            secrets: [{ uri: "pathOfMySecret", value: "resolved" }],
        }, {
                teamId: "T666",
                correlationId: "555",
                messageClient,
            })
            .then(hr => {
                assert((hr as any).computed === "value");
                done();
            },
            done);
    });

    it("should use bind call to compute on external parameters", done => {
        const s = new BuildableAutomationServer({ name: "foobar", version: "1.0.0", teamIds: ["bar"], keywords: [] });

        @Parameters()
        class SParams implements SmartParameters {
            @Parameter({ required: true })
            public isSmartExternal: string;
            @Secret("pathOfMySecret")
            public mySecret: string = "should_be_overwitten";

            public random = "this is fine, leave it alone";

            public computed = "should_be_overwritten";

            public bindAndValidate() {
                this.computed = this.isSmartExternal;
            }
        }

        @CommandHandler("goo bar")
        class Handler implements HandleCommand<SParams> {

            public freshParametersInstance() {
                return new SParams();
            }

            public handle(ch, params) {
                return Promise.resolve({
                    code: 0,
                    computed: params.computed,
                });
            }
        }

        s.registerCommandHandler(Handler);
        s.invokeCommand({
            name: "Handler",
            args: [{ name: "isSmartExternal", value: "value1" }],
            secrets: [{ uri: "pathOfMySecret", value: "resolved" }],
        }, {
                teamId: "T666",
                correlationId: "555",
                messageClient,
            })
            .then(hr => {
                assert((hr as any).computed === "value1", stringify(hr));
                done();
            },
            done);
    });

    it("should allow registration of null command handler", () => {
        const s = new BuildableAutomationServer({ name: "foobar", version: "1.0.0", teamIds: ["bar"], keywords: [] });
        s.registerCommandHandler(() => null);
        assert.equal(s.automations.commands.length, 0);
        assert.equal(s.automations.events.length, 0);
    });

    it("should allow registration of null event handler", () => {
        const s = new BuildableAutomationServer({ name: "foobar", version: "1.0.0", teamIds: ["bar"], keywords: [] });
        s.registerEventHandler(() => null);
        assert.equal(s.automations.commands.length, 0);
        assert.equal(s.automations.events.length, 0);
    });

    it("should allow dynamic registration of command handler", () => {
        const s = new BuildableAutomationServer({ name: "foobar", version: "1.0.0", teamIds: ["bar"], keywords: [] });
        let register = false;
        s.registerCommandHandler(() => {
            if (register) {
                return new HelloWorld();
            } else {
                return null;
            }
        });
        assert.equal(s.automations.commands.length, 0);
        register = true;
        s.registerCommandHandler(() => {
            if (register) {
                return new HelloWorld();
            } else {
                return null;
            }
        });
        assert.equal(s.automations.commands.length, 1);
        assert.equal(s.automations.events.length, 0);
    });

});
