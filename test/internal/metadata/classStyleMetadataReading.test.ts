
import * as assert from "power-assert";
import { Configuration } from "../../../lib/configuration";
import {
    CommandHandler,
    ConfigurableCommandHandler,
    MappedParameter,
    MappedParameters,
    Parameter,
    Secret,
    Tags,
    Value,
} from "../../../lib/decorators";
import { HandleCommand } from "../../../lib/HandleCommand";
import {
    EventFired,
    HandleEvent,
} from "../../../lib/HandleEvent";
import { HandlerContext } from "../../../lib/HandlerContext";
import { HandlerResult } from "../../../lib/HandlerResult";
import { metadataFromInstance } from "../../../lib/internal/metadata/metadataReading";

import {
    populateParameters,
    populateValues,
} from "../../../lib/internal/parameterPopulation";
import {
    CommandHandlerMetadata,
    EventHandlerMetadata,
    FreeChoices,
} from "../../../lib/metadata/automationMetadata";
import {
    oneOf,
    someOf,
} from "../../../lib/metadata/parameterUtils";
import { AddAtomistSpringAgent } from "../invoker/TestHandlers";

describe("class style metadata reading", () => {

    it("should extract metadataFromInstance from command handler", () => {
        const h = new AddAtomistSpringAgent();
        const md = metadataFromInstance(h) as CommandHandlerMetadata;
        assert(!!md.name);
        assert(md.parameters.length === 1);
        assert(md.parameters[0].name === "slackTeam");
        assert(md.mapped_parameters.length === 2);
        assert(md.mapped_parameters[0].name === "githubWebUrl");
        assert(md.mapped_parameters[0].uri === "atomist://github_url");
        assert(md.mapped_parameters[0].required);
        assert(md.secrets.length === 1);
        assert(md.secrets[0].name === "someSecret");
        assert(md.secrets[0].uri === "atomist://some_secret");
    });

    it("should handle inherited parameters", () => {
        const h = new Subclass();
        const md = metadataFromInstance(h) as CommandHandlerMetadata;
        assert(md.parameters.length === 2, "Should find both parameters");
        assert(md.parameters.some(p => p.name === "subclassParam"), "Subclass parameter should be found");
        assert(md.parameters.some(p => p.name === "superclassParam"), "Parameter should be inherited");
        assert(md.mapped_parameters.length === 2);
        assert(md.secrets.length === 2);
        assert(md.secrets.some(p => p.name === "subSecret"), "Subclass secret should be found");
        assert(md.secrets.some(p => p.name === "superSecret"), "Secret should be inherited");
        assert(md.auto_submit);
    });

    it("should handle inherited parameters through the entire hierarchy", () => {
        const h = new SubSubclass();
        const md = metadataFromInstance(h) as CommandHandlerMetadata;
        assert(md.parameters.length === 3, "Should find all parameters");
        assert(md.parameters.some(p => p.name === "subclassParam"), "Subclass parameter should be found");
        assert(md.parameters.some(p => p.name === "superclassParam"), "Parameter should be inherited");
        assert(md.mapped_parameters.length === 3);
        assert(md.secrets.length === 3);
        assert(md.secrets.some(p => p.name === "subSecret"), "Subclass secret should be found");
        assert(md.secrets.some(p => p.name === "subSubSecret"), "SubSubclass secret should be found");
        assert(md.secrets.some(p => p.name === "superSecret"), "Secret should be inherited");
        assert(md.auto_submit);
    });

    it("should convert to explicit type: boolean", () => {
        const h = new HasDefaultedBooleanParam();
        const md = metadataFromInstance(h) as CommandHandlerMetadata;
        populateParameters(h, md, [{ name: "booleanParam", value: true }]);
        assert(h.booleanParam === true);
        populateParameters(h, md, [{ name: "booleanParam", value: "false" }]);
        assert(h.booleanParam === false);
    });

    it("should convert to explicit type: number", () => {
        const h = new HasNumberParam();
        const md = metadataFromInstance(h) as CommandHandlerMetadata;
        populateParameters(h, md, [{ name: "numberParam", value: 1 }]);
        assert(h.numberParam === 1);
        populateParameters(h, md, [{ name: "numberParam", value: "100" }]);
        assert(h.numberParam === 100);
    });

    it("should convert to explicit type: single choice", () => {
        const h = new HasOneChoiceParam();
        const md = metadataFromInstance(h) as CommandHandlerMetadata;
        populateParameters(h, md, [{ name: "animal", value: "pig" }]);
        assert(h.animal === "pig");
        populateParameters(h, md, [{ name: "animal", value: "dog" }]);
        assert(h.animal === "dog");
    });

    it("should convert to explicit type: some choices", () => {
        const h = new HasSomeChoicesParam();
        const md = metadataFromInstance(h) as CommandHandlerMetadata;
        populateParameters(h, md, [{ name: "pets", value: ["pig"] }]);
        assert.deepEqual(h.pets, ["pig"]);
        populateParameters(h, md, [{ name: "pets", value: ["dog", "cat"] }]);
        assert.deepEqual(h.pets, ["dog", "cat"]);
    });

    it("should convert to explicit type: some free choices", () => {
        const h = new HasSomeFreeChoicesParam();
        const md = metadataFromInstance(h) as CommandHandlerMetadata;
        populateParameters(h, md, [{ name: "pets", value: ["pig", "heffalump"] }]);
        assert.deepEqual(h.pets, ["pig", "heffalump"]);
        populateParameters(h, md, [{ name: "pets", value: ["dog", "cat"] }]);
        assert.deepEqual(h.pets, ["dog", "cat"]);
    });

    it("should handle both tags and intent", () => {
        const h = new TagsAndIntent();
        const md = metadataFromInstance(h) as CommandHandlerMetadata;
        assert.deepEqual(md.intent, ["universal", "generator"]);
        assert.deepEqual(md.tags.map(t => t.name), ["universal", "generator"]);
    });

    it("should handle non-decorator command handler metadata", () => {
        const h = new NoDecoratorCommandHandler();
        const md = metadataFromInstance(h) as CommandHandlerMetadata;
        assert(md.name === h.name);
        assert(md.description === h.description);
        assert.deepEqual(md.parameters, h.parameters);
    });

    it("should handle non-decorator sub-class command handler metadata", () => {
        const h = new NoDecoratorCommandHandlerSubClass();
        const md = metadataFromInstance(h) as CommandHandlerMetadata;
        assert(md.name === h.name);
        assert(md.description === h.description);
        assert(md.parameters.length === 2);
        assert.deepEqual(md.parameters, h.parameters);
    });

    it("should handle non-decorator event handler metadata", () => {
        const h = new NoDecoratorEventHandler();
        const md = metadataFromInstance(h) as EventHandlerMetadata;
        assert(md.name === h.name);
        assert(md.description === h.description);
        assert(md.subscriptionName === h.subscriptionName);
        assert(md.subscription === h.subscription);
    });

    it("should handle non-decorator event handler metadata without name", () => {
        const h = new NoDecoratorEventHandlerWithoutInterface();
        const md = metadataFromInstance(h) as EventHandlerMetadata;
        assert(md.name === "NoDecoratorEventHandlerWithoutInterface");
        assert(md.description === h.description);
        assert(md.subscriptionName === h.subscriptionName);
        assert(md.subscription === h.subscription);
    });

    it("should not have empty intent array", () => {
        const h = new HasNumberParam();
        const md = metadataFromInstance(h) as CommandHandlerMetadata;
        assert(md.intent.length === 0);
    });

    it("should not have empty tag array", () => {
        const h = new HasNumberParam();
        const md = metadataFromInstance(h) as CommandHandlerMetadata;
        assert(md.tags.length === 0);
    });

    it("should handle @MappedParameter with required=false", () => {
        const h = new OptionalMappedParameter();
        const md = metadataFromInstance(h) as CommandHandlerMetadata;
        const mp = md.mapped_parameters[0];
        assert(mp.required === false);
    });

    it("should handle @Value", () => {
        const h = new Subclass();
        const md = metadataFromInstance(h) as CommandHandlerMetadata;
        const mp = md.values[0];
        assert(mp.required === true);
        assert(mp.name === "automationClientName");
        assert(mp.path === "name");

        const config: Configuration = {
            name: "test-client",
        };

        populateValues(h, md, config);
        assert.equal(h.automationClientName, config.name);
    });

    it("should handle @Value with required=false", () => {
        const h = new HasDefaultedBooleanParam();
        const md = metadataFromInstance(h) as CommandHandlerMetadata;
        const mp = md.values[0];
        assert(mp.required === false);
        assert(mp.name === "teams");
        assert(mp.path === "workspaceIds");

        const config: Configuration = {
            workspaceIds: ["123", "456"],
        };

        populateValues(h, md, config);
        assert.equal(h.teams, config.workspaceIds);

    });

    it("should handle @Value with boolean type conversation", () => {
        const h = new HasBooleanValue();
        const md = metadataFromInstance(h) as CommandHandlerMetadata;
        const mp = md.values[0];
        assert(mp.required === true);
        assert(mp.name === "foo");
        assert(mp.path === "custom.foo");

        const config: Configuration = {
            custom: {
                foo: "true",
            },
        };

        populateValues(h, md, config);
        assert.equal(h.foo, true);
    });

    it("should handle @Value with number type conversation", () => {
        const h = new HasNumberValue();
        const md = metadataFromInstance(h) as CommandHandlerMetadata;
        const mp = md.values[0];
        assert(mp.required === true);
        assert(mp.name === "foo");
        assert(mp.path === "custom.foo");

        const config: Configuration = {
            custom: {
                foo: "10",
            },
        };

        populateValues(h, md, config);
        assert.equal(h.foo, 10);
    });

    it("should handle @Value with string type conversation", () => {
        const h = new HasStringValue();
        const md = metadataFromInstance(h) as CommandHandlerMetadata;
        const mp = md.values[0];
        assert(mp.required === true);
        assert(mp.name === "foo");
        assert(mp.path === "custom.foo");

        const config: Configuration = {
            custom: {
                foo: 1,
            },
        };

        populateValues(h, md, config);
        assert.equal(h.foo, "1");
    });

});

export class Superclass implements HandleCommand {

    @Parameter({
        displayName: "Slack Team ID",
        description: "team identifier for Slack team associated with this repo",
        pattern: /^T[0-9A-Z]+$/,
        validInput: "Slack team identifier of form T0123WXYZ",
        required: true,
    })
    public superclassParam: string;

    @MappedParameter("atomist://github_url")
    public githubWebUrl: string;

    @Secret("atomist://some_secret")
    public superSecret: string;

    @Value("name")
    public automationClientName: string;

    public handle(context: HandlerContext): Promise<HandlerResult> {
        throw new Error("not relevant");
    }
}

@ConfigurableCommandHandler("Some sub class", { autoSubmit: true })
@Tags("atomist", "spring")
class Subclass extends Superclass {

    @Parameter({
        displayName: "Thing",
        description: "A thing",
        pattern: /^T[0-9A-Z]+$/,
        validInput: "Thing",
        required: true,
    })
    public subclassParam: string;

    @MappedParameter(MappedParameters.GitHubRepository)
    public repo: string;

    @Secret("atomist://some_secret")
    public subSecret: string;

}

@CommandHandler("Some sub sub class")
class SubSubclass extends Subclass {

    @Parameter({
        displayName: "a boolean",
        pattern: /^T[0-9A-Z]+$/,
        required: false,
        type: "boolean",
    })
    public booleanParam: boolean = true;

    @MappedParameter(MappedParameters.GitHubRepository)
    public subRepo: string;

    @Secret("atomist://some_secret?path")
    public subSubSecret: string;

}

@CommandHandler("name")
export class HasDefaultedBooleanParam implements HandleCommand {

    @Parameter({
        displayName: "a boolean",
        pattern: /^T[0-9A-Z]+$/,
        required: false,
        type: "boolean",
    })
    public booleanParam: boolean = true;

    @Value({ path: "workspaceIds", required: false })
    public teams: string[];

    public handle(context: HandlerContext): Promise<HandlerResult> {
        throw new Error("not relevant");
    }
}

@CommandHandler("name")
export class HasNumberParam implements HandleCommand {

    @Parameter({
        displayName: "a boolean",
        pattern: /^T[0-9A-Z]+$/,
        required: false,
        type: "number",
    })
    public numberParam: number;

    public handle(context: HandlerContext): Promise<HandlerResult> {
        throw new Error("not relevant");
    }
}

@CommandHandler("name")
export class HasOneChoiceParam implements HandleCommand {

    @Parameter({
        displayName: "a boolean",
        pattern: /^T[0-9A-Z]+$/,
        required: false,
        type: oneOf("dog", "cat", "pig"),
    })
    public animal: string;

    public handle(context: HandlerContext): Promise<HandlerResult> {
        throw new Error("not relevant");
    }
}

@CommandHandler("name")
export class HasSomeChoicesParam implements HandleCommand {

    @Parameter({
        displayName: "a boolean",
        pattern: /^T[0-9A-Z]+$/,
        required: false,
        type: someOf("dog", "cat", "pig"),
    })
    public pets: string[];

    public handle(context: HandlerContext): Promise<HandlerResult> {
        throw new Error("not relevant");
    }
}

@CommandHandler("name")
export class HasSomeFreeChoicesParam implements HandleCommand {

    @Parameter({
        displayName: "a boolean",
        pattern: /^T[0-9A-Z]+$/,
        required: false,
        type: FreeChoices,
    })
    public pets: string[];

    public handle(context: HandlerContext): Promise<HandlerResult> {
        throw new Error("not relevant");
    }
}

@ConfigurableCommandHandler("description", { intent: ["universal", "generator"], autoSubmit: true })
@Tags("universal", "generator")
export class TagsAndIntent implements HandleCommand {

    public handle(context: HandlerContext): Promise<HandlerResult> {
        throw new Error("not relevant");
    }
}

export class NoDecoratorCommandHandler implements HandleCommand, CommandHandlerMetadata {

    protected static params() {
        return [{ name: "foo", description: "Some param", required: false, pattern: /^.*$/.source }];
    }

    public name = "NoDecoratorCommandHandler";
    public description = "Some description";
    public tags = [];
    public intent = [];
    public parameters = NoDecoratorCommandHandler.params();

    public handle(context: HandlerContext): Promise<HandlerResult> {
        throw new Error("not relevant");
    }
}

export class NoDecoratorCommandHandlerSubClass
    extends NoDecoratorCommandHandler implements HandleCommand, CommandHandlerMetadata {

    protected static params() {
        return [...NoDecoratorCommandHandler.params(),
        { name: "bar", description: "Some param", required: false, pattern: /^.*$/.source }];
    }

    public parameters = NoDecoratorCommandHandlerSubClass.params();

    public handle(context: HandlerContext): Promise<HandlerResult> {
        throw new Error("not relevant");
    }

}

export class NoDecoratorEventHandler implements HandleEvent<any>, EventHandlerMetadata {

    public name = "NoDecoratorEventHandler";
    public description = "Some description";
    public tags = [];
    public subscriptionName = "Foo";
    public subscription = "subscription Foo { Issue { name } }";

    public handle(event: EventFired<any>, context: HandlerContext): Promise<HandlerResult> {
        throw new Error("not relevant");
    }
}

export class NoDecoratorEventHandlerWithoutInterface implements HandleEvent<any> {

    public description = "Some description";
    public tags = [];
    public subscriptionName = "Foo";
    public subscription = "subscription Foo { Issue { name } }";

    public handle(event: EventFired<any>, context: HandlerContext): Promise<HandlerResult> {
        throw new Error("not relevant");
    }
}

@CommandHandler("description", "universal", "generator")
@Tags("universal", "generator")
export class OptionalMappedParameter implements HandleCommand {

    @MappedParameter("lookup", false)
    public foo: string;

    public handle(context: HandlerContext): Promise<HandlerResult> {
        throw new Error("not relevant");
    }
}

@CommandHandler("description", "universal", "generator")
export class HasBooleanValue implements HandleCommand {

    @Value({ path: "custom.foo", type: "boolean" })
    public foo: boolean;

    public handle(context: HandlerContext): Promise<HandlerResult> {
        throw new Error("not relevant");
    }
}

@CommandHandler("description", "universal", "generator")
export class HasNumberValue implements HandleCommand {

    @Value({ path: "custom.foo", type: "number" })
    public foo: number;

    public handle(context: HandlerContext): Promise<HandlerResult> {
        throw new Error("not relevant");
    }
}

@CommandHandler("description", "universal", "generator")
export class HasStringValue implements HandleCommand {

    @Value({ path: "custom.foo", type: "string" })
    public foo: string;

    public handle(context: HandlerContext): Promise<HandlerResult> {
        throw new Error("not relevant");
    }
}
