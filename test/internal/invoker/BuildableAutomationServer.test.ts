import stringify = require("json-stringify-safe");
import * as assert from "power-assert";
import {
    CommandHandler,
    EventHandler,
    MappedParameter,
    Parameter,
    Parameters,
    Secret,
    Secrets,
} from "../../../lib/decorators";
import {
    HandleCommand,
    SelfDescribingHandleCommand,
} from "../../../lib/HandleCommand";
import { HandleEvent } from "../../../lib/HandleEvent";
import { HandlerResult } from "../../../lib/HandlerResult";
import { consoleMessageClient } from "../../../lib/internal/message/ConsoleMessageClient";
import { succeed } from "../../../lib/operations/support/contextUtils";
import { AutomationServer } from "../../../lib/server/AutomationServer";
import { BuildableAutomationServer } from "../../../lib/server/BuildableAutomationServer";
import { SmartParameters } from "../../../lib/SmartParameters";
import { AutomationMetadataProcessor } from "../../../lib/spi/env/MetadataProcessor";
import { SecretResolver } from "../../../lib/spi/env/SecretResolver";
import { HelloWorld } from "../../command/HelloWorld";
import {
    AddAtomistSpringAgent,
    AlwaysOkEventHandler,
    TrustMeIGaveMySecret,
} from "./TestHandlers";

/* tslint:disable:max-classes-per-file max-file-line-count */

const messageClient = consoleMessageClient;

describe("BuildableAutomationServer", () => {

    it("should start with no automations", () => {
        const s = new BuildableAutomationServer({ name: "foobar", version: "1.0.0", workspaceIds: ["bar"], keywords: [] });
        assert(s.automations.commands.length === 0);
        assert(s.automations.events.length === 0);
    });

    it("should register one no-arg handler and return its metadataFromInstance", () => {
        const s = new BuildableAutomationServer({ name: "foobar", version: "1.0.0", workspaceIds: ["bar"], keywords: [] });
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
        const s = new BuildableAutomationServer({ name: "foobar", version: "1.0.0", workspaceIds: ["bar"], keywords: [] });
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
        const s = new BuildableAutomationServer({ name: "foobar", version: "1.0.0", workspaceIds: ["bar"], keywords: [] });
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
                workspaceId: "T666",
                correlationId: "555",
                messageClient,
            });
        });
    });

    it("should register one single arg handler and not complain on invocation without defaulted parameter", done => {
        const s = new BuildableAutomationServer({ name: "foobar", version: "1.0.0", workspaceIds: ["bar"], keywords: [] });
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
            workspaceId: "T666",
            correlationId: "555",
            messageClient,
        }).then(res => {
            assert(res.code === 0);
            done();
        });
    });

    it("should register one single arg handler and invoke with valid parameter", async () => {
        const s = new BuildableAutomationServer({ name: "foobar", version: "1.0.0", workspaceIds: ["bar"], keywords: [] });
        const h: SelfDescribingHandleCommand = {
            name: "foo", description: "foo", parameters: [{
                name: "one", description: "a thing", pattern: ".*", required: true,
            },
            ], tags: [], intent: [], mapped_parameters: [],
            handle: (ch, params) => {
                return Promise.resolve({
                    code: 0,
                    paramVal: (params).one,
                });
            },
        };
        s.registerCommandHandler(() => h);
        await registerOneSingleArgHandlerAndInvokeWithValidParameter(s);
    });

    function registerOneSingleArgHandlerAndInvokeWithValidParameter(s: AutomationServer): Promise<void> {
        return s.invokeCommand({
            name: "foo",
            args: [{ name: "one", value: "value" }],
        }, {
            workspaceId: "T666",
            correlationId: "555",
            messageClient,
        }).then(hr => {
            assert((hr as any).paramVal === "value");
        });
    }

    it("should register one command handler instance and invoke with valid parameter", done => {
        const s = new BuildableAutomationServer({ name: "foobar", version: "1.0.0", workspaceIds: ["bar"], keywords: [] });
        s.registerCommandHandler(AddAtomistSpringAgent);
        s.invokeCommand({
            name: "AddAtomistSpringAgent",
            args: [{ name: "slackTeam", value: "T1691" }],
            secrets: [{ uri: "atomist://some_secret", value: "some_secret" }],
        }, {
            workspaceId: "T666",
            correlationId: "555",
            messageClient,
        })
            .then(_ => done());
    });

    it("should register one event handler instance and invoke with valid event data", done => {
        const s = new BuildableAutomationServer({ name: "foobar", version: "1.0.0", workspaceIds: ["bar"], keywords: [] });
        s.registerEventHandler(AlwaysOkEventHandler);
        s.onEvent({
            extensions: {
                operationName: "AlwaysOkEventHandler",
            },
            data: {
                Thing: [{
                    some_thing: 27,
                }],
            },
        }, {
            workspaceId: "T666",
            correlationId: "555",
            messageClient,
        }).then(_ => {
            assert((_[0] as any).thing === 27);
            done();
        });
    });

    it("should register one event handler instance and access secret through params", done => {
        const sr: SecretResolver = {
            resolve(sec: string): string {
                assert(sec === "github://org_token");
                return "valid";
            },
        };
        const s = new BuildableAutomationServer(
            { name: "foobar", version: "1.0.0", workspaceIds: ["bar"], keywords: [], secretResolver: sr });
        s.registerEventHandler(TrustMeIGaveMySecret);
        s.onEvent({
            extensions: {
                operationName: "TrustMeIGaveMySecret",
            },
            data: {
                Thing: [{
                    some_thing: 27,
                }],
            },
        }, {
            workspaceId: "T666",
            correlationId: "555",
            messageClient,
        }).then(_ => {
            assert((_[0] as any).thing === 27);
            done();
        });
    });

    it("should register one single arg handler using nested parameters and invoke with valid parameter", done => {
        const s = new BuildableAutomationServer({ name: "foobar", version: "1.0.0", workspaceIds: ["bar"], keywords: [] });

        class Params {
            @Parameter()
            public one: string;
        }

        @CommandHandler("goo bar")
        class Handler {
            public nested: Params = new Params();

            public handle(ch, params): Promise<HandlerResult> {
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
            workspaceId: "T666",
            correlationId: "555",
            messageClient,
        }).then(hr => {
            assert((hr as any).paramVal === "value");
            done();
        }).catch(done);
    });

    it("should register single arg handler using nested mapped parameters and invoke with valid parameter",
        async () => mappedParameterTest(true));

    it("should register single arg handler using nested optional mapped parameters and invoke with valid parameter",
        async () => mappedParameterTest(false));

    async function mappedParameterTest(required: boolean): Promise<void> {
        const s = new BuildableAutomationServer({ name: "foobar", version: "1.0.0", workspaceIds: ["bar"], keywords: [] });

        class Params {
            @Parameter()
            public one: string;
            @MappedParameter("fk", required)
            public mapped: string = "should_be_overwitten";
        }

        @CommandHandler("goo bar")
        class Handler {
            public nested: Params = new Params();

            public handle(ch, params): Promise<HandlerResult> {
                return Promise.resolve({
                    code: 0,
                    paramVal: params.nested.one,
                    mappedVal: params.nested.mapped,
                });
            }
        }

        s.registerCommandHandler(Handler);
        await s.invokeCommand({
            name: "Handler",
            args: [{ name: "nested.one", value: "value" }],
            mappedParameters: [{ name: "nested.mapped", value: "resolved" }],
        }, {
            workspaceId: "T666",
            correlationId: "555",
            messageClient,
        }).then(hr => {
            assert((hr as any).mappedVal === "resolved", stringify(hr, undefined, 2));
        });
    }

    it("should register single arg handler using nested optional mapped parameters and invoke with valid parameter", async () => {
        const s = new BuildableAutomationServer({ name: "foobar", version: "1.0.0", workspaceIds: ["bar"], keywords: [] });

        class Params {
            @Parameter()
            public one: string;
            @MappedParameter("fk", false)
            public mapped: string = "should_not_be_overwitten";
        }

        @CommandHandler("goo bar")
        class Handler {
            public nested: Params = new Params();

            public handle(ch, params): Promise<HandlerResult> {
                return Promise.resolve({
                    code: 0,
                    paramVal: params.nested.one,
                    mappedVal: params.nested.mapped,
                });
            }
        }

        s.registerCommandHandler(Handler);
        await s.invokeCommand({
            name: "Handler",
            args: [{ name: "nested.one", value: "value" }],
            mappedParameters: [],
        }, {
            workspaceId: "T666",
            correlationId: "555",
            messageClient,
        }).then(hr => {
            assert((hr as any).mappedVal === "should_not_be_overwitten", stringify(hr, undefined, 2));
        });
    });

    it("should register single arg handler using nested secrets and invoke with valid parameter", async () => {
        const s = new BuildableAutomationServer({ name: "foobar", version: "1.0.0", workspaceIds: ["bar"], keywords: [] });

        class Params {
            @Parameter()
            public one: string;
            @Secret("pathOfMySecret")
            public mySecret: string = "should_be_overwitten";
        }

        @CommandHandler("goo bar")
        class Handler {
            public nested: Params = new Params();

            public handle(ch, params): Promise<HandlerResult> {
                return Promise.resolve({
                    code: 0,
                    paramVal: params.nested.one,
                    mappedVal: params.nested.mySecret,
                });
            }
        }

        s.registerCommandHandler(Handler);
        await s.invokeCommand({
            name: "Handler",
            args: [{ name: "nested.one", value: "value" }],
            secrets: [{ uri: "pathOfMySecret", value: "resolved" }],
        }, {
            workspaceId: "T666",
            correlationId: "555",
            messageClient,
        }).then(hr => {
            assert((hr as any).mappedVal === "resolved", stringify(hr, undefined, 2));
        });
    });

    it("should fail parameter validation", async () => {
        const s = new BuildableAutomationServer({ name: "foobar", version: "1.0.0", workspaceIds: ["bar"], keywords: [] });

        class Params {
            @Parameter({ required: true })
            public isSmart: string;
            @Secret("pathOfMySecret")
            public mySecret: string = "should_be_overwitten";
        }

        @CommandHandler("goo bar")
        class Handler implements SmartParameters {
            public nested: Params = new Params();

            public bindAndValidate(): { message: string } {
                return { message: "The sploshing flange is invalid" };
            }

            public handle(ch, params): Promise<HandlerResult> {
                return Promise.resolve({
                    code: 0,
                    mappedVal: params.nested.mySecret,
                });
            }
        }

        s.registerCommandHandler(Handler);
        await s.invokeCommand({
            name: "Handler",
            args: [{ name: "nested.isSmart", value: "value" }],
            secrets: [{ uri: "pathOfMySecret", value: "resolved" }],
        }, {
            workspaceId: "T666",
            correlationId: "555",
            messageClient,
        })
            .then(ok => {
                assert.fail("Should have failed validation");
            },
                err => {
                    assert(err.includes("sploshing flange"));
                });
    });

    it("should use bind call to compute property", async () => {
        const s = new BuildableAutomationServer({ name: "foobar", version: "1.0.0", workspaceIds: ["bar"], keywords: [] });

        class Params {
            @Parameter({ required: true })
            public isSmart: string;
            @Secret("pathOfMySecret")
            public mySecret: string = "should_be_overwitten";
        }

        @CommandHandler("goo bar")
        class Handler implements SmartParameters {
            public nested: Params = new Params();
            private additional: string = "should_be_overwritten";

            public bindAndValidate(): void {
                this.additional = this.nested.isSmart;
            }

            public handle(ch, params): Promise<HandlerResult> {
                return Promise.resolve({
                    code: 0,
                    computed: params.additional,
                });
            }
        }

        s.registerCommandHandler(Handler);
        await s.invokeCommand({
            name: "Handler",
            args: [{ name: "nested.isSmart", value: "value" }],
            secrets: [{ uri: "pathOfMySecret", value: "resolved" }],
        }, {
            workspaceId: "T666",
            correlationId: "555",
            messageClient,
        })
            .then(hr => {
                assert((hr as any).computed === "value");
            });
    });

    it("should use bind call to compute on external parameters", async () => {
        const s = new BuildableAutomationServer({ name: "foobar", version: "1.0.0", workspaceIds: ["bar"], keywords: [] });

        @Parameters()
        class SParams implements SmartParameters {
            @Parameter({ required: true })
            public isSmartExternal: string;
            @Secret("pathOfMySecret")
            public mySecret: string = "should_be_overwitten";

            public random: string = "this is fine, leave it alone";

            public computed: string = "should_be_overwritten";

            public bindAndValidate(): void {
                this.computed = this.isSmartExternal;
            }
        }

        @CommandHandler("goo bar")
        class Handler implements HandleCommand<SParams> {

            public freshParametersInstance(): SParams {
                return new SParams();
            }

            public handle(ch, params): Promise<HandlerResult> {
                return Promise.resolve({
                    code: 0,
                    computed: params.computed,
                });
            }
        }

        s.registerCommandHandler(Handler);
        await s.invokeCommand({
            name: "Handler",
            args: [{ name: "isSmartExternal", value: "value1" }],
            secrets: [{ uri: "pathOfMySecret", value: "resolved" }],
        }, {
            workspaceId: "T666",
            correlationId: "555",
            messageClient,
        })
            .then(hr => {
                assert((hr as any).computed === "value1", stringify(hr));
            });
    });

    it("should allow registration of null command handler", () => {
        const s = new BuildableAutomationServer({ name: "foobar", version: "1.0.0", workspaceIds: ["bar"], keywords: [] });
        // tslint:disable-next-line:no-null-keyword
        s.registerCommandHandler(() => null);
        assert.equal(s.automations.commands.length, 0);
        assert.equal(s.automations.events.length, 0);
    });

    it("should allow registration of null event handler", () => {
        const s = new BuildableAutomationServer({ name: "foobar", version: "1.0.0", workspaceIds: ["bar"], keywords: [] });
        // tslint:disable-next-line:no-null-keyword
        s.registerEventHandler(() => null);
        assert.equal(s.automations.commands.length, 0);
        assert.equal(s.automations.events.length, 0);
    });

    it("should allow dynamic registration of command handler", () => {
        const s = new BuildableAutomationServer({ name: "foobar", version: "1.0.0", workspaceIds: ["bar"], keywords: [] });
        let register = false;
        s.registerCommandHandler(() => {
            if (register) {
                return new HelloWorld();
            } else {
                return undefined;
            }
        });
        assert.equal(s.automations.commands.length, 0);
        register = true;
        s.registerCommandHandler(() => {
            if (register) {
                return new HelloWorld();
            } else {
                return undefined;
            }
        });
        assert.equal(s.automations.commands.length, 1);
        assert.equal(s.automations.events.length, 0);
    });

    it("should succeed if command handler returns undefined or null", done => {
        const s = new BuildableAutomationServer({ name: "foobar", version: "1.0.0", workspaceIds: ["bar"], keywords: [] });

        @CommandHandler("goo bar")
        class Handler implements HandleCommand {

            public handle(ch, params): Promise<HandlerResult> {
                return Promise.resolve(undefined);
            }
        }

        s.registerCommandHandler(Handler);
        s.invokeCommand({
            name: "Handler",
            args: [],
            secrets: [],
        }, {
            workspaceId: "T666",
            correlationId: "555",
            messageClient,
        })
            .then(hr => {
                assert(hr.code === 0);
                done();
            },
                done);
    });

    it("should succeed if event handler returns undefined or null", done => {
        const s = new BuildableAutomationServer({ name: "foobar", version: "1.0.0", workspaceIds: ["bar"], keywords: [] });

        @EventHandler("goo bar", "subscription Test { Issue { title }}")
        class Handler implements HandleEvent<any> {

            public handle(ch, params): Promise<HandlerResult> {
                return Promise.resolve(undefined);
            }
        }

        s.registerEventHandler(Handler);
        s.onEvent({
            data: {
                Issue: [{
                    title: "test",
                }],
            },
            extensions: {
                operationName: "Handler",
            },
        }, {
            workspaceId: "T666",
            correlationId: "555",
            messageClient,
        })
            .then(hr => {
                assert(hr[0].code === 0);
                done();
            },
                done);
    });

    it("should use registered metadata processor", () => {

        class TestAutomationMetadataProcessor implements AutomationMetadataProcessor {
            public process(metadata: any, c: any): any {
                assert.equal(1, metadata.secrets.length);
                metadata.values.push({ name: "orgToken", path: "token", required: true, type: "string" });
                metadata.secrets = [];
                return metadata;
            }
        }

        const s = new BuildableAutomationServer({
            name: "foobar",
            version: "1.0.0",
            workspaceIds: ["bar"],
            keywords: [],
            metadataProcessor: new TestAutomationMetadataProcessor(),
        });

        @EventHandler("goo bar", "subscription Test { Issue { title }}")
        class Handler implements HandleEvent<any> {

            @Secret(Secrets.OrgToken)
            public orgToken: string;

            public handle(ch, params): Promise<HandlerResult> {
                return Promise.resolve(undefined);
            }
        }

        s.registerEventHandler(Handler);
        const handler = s.automations.events[0];
        assert.equal(1, handler.values.length);
        assert.equal("orgToken", handler.values[0].name);
        assert.equal("token", handler.values[0].path);
        assert.equal(0, handler.secrets.length);
    });
});
