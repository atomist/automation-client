import "mocha";
import { metadataFromInstance } from "../../../src/internal/metadata/metadataReading";

import * as assert from "power-assert";
import { CommandHandler, MappedParameter, Parameter, Secret, Tags } from "../../../src/decorators";
import { HandleCommand } from "../../../src/HandleCommand";
import { EventFired, HandleEvent } from "../../../src/HandleEvent";
import { HandlerContext } from "../../../src/HandlerContext";
import { HandlerResult } from "../../../src/HandlerResult";
import { MappedParameters } from "../../../src/Handlers";
import {
    CommandHandlerMetadata,
    EventHandlerMetadata,
    IngestorMetadata,
} from "../../../src/internal/metadata/metadata";
import { populateParameters } from "../../../src/operations/support/parameterPopulation";
import { AddAtomistSpringAgent, FooBarIngestor } from "./TestHandlers";

describe("RugReader", () => {

    it("should extract metadataFromInstance from command handler", () => {
        const h = new AddAtomistSpringAgent();
        const md = metadataFromInstance(h) as CommandHandlerMetadata;
        assert(md.parameters.length === 1);
        assert(md.parameters[0].name === "slackTeam");
        assert(md.mapped_parameters.length === 2);
        assert(md.mapped_parameters[0].local_key === "githubWebUrl");
        assert(md.mapped_parameters[0].foreign_key === "atomist://github_url");
        assert(md.secrets.length === 1);
        assert(md.secrets[0].name === "someSecret");
        assert(md.secrets[0].path === "atomist://some_secret");
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
    });

    it("should convert to explicit type: boolean", () => {
        const h = new HasDefaultedBooleanParam();
        const md = metadataFromInstance(h) as CommandHandlerMetadata;
        populateParameters(h, md, [ {name: "booleanParam", value: "true"}]);
        assert(h.booleanParam === true);
        populateParameters(h, md, [ {name: "booleanParam", value: "false"}]);
        assert(h.booleanParam === false);
    });

    it("should convert to explicit type: number", () => {
        const h = new HasNumberParam();
        const md = metadataFromInstance(h) as CommandHandlerMetadata;
        populateParameters(h, md, [ {name: "numberParam", value: "1"}]);
        assert(h.numberParam === 1);
        populateParameters(h, md, [ {name: "numberParam", value: "100"}]);
        assert(h.numberParam === 100);
    });

    it("should handle both tags and intent", () => {
        const h = new TagsAndIntent();
        const md = metadataFromInstance(h) as CommandHandlerMetadata;
        assert.deepEqual(md.intent, [ "universal", "generator"]);
        assert.deepEqual(md.tags, [ "universal", "generator"]);
    });

    it("should handle ingestor metadata", () => {
        const h = new FooBarIngestor();
        const md = metadataFromInstance(h) as IngestorMetadata;
        assert(md.route === "FooBarIngestor");
        assert(md.name === "FooBarIngestor");
        assert(md.description === "Always returns OK");
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

    it("should handle non-decorator ingestor metadata", () => {
        const h = new NoDecoratorIngestor();
        const md = metadataFromInstance(h) as IngestorMetadata;
        assert(md.name === h.name);
        assert(md.description === h.description);
        assert(md.route === h.route);
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

    public handle(context: HandlerContext): Promise<HandlerResult> {
        throw new Error("not relevant");
    }
}

@CommandHandler("AddAtomistSpringAgent", "add the Atomist Spring Boot agent to a Spring Boot project")
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

    @MappedParameter(MappedParameters.GITHUB_REPOSITORY)
    public repo: string;

    @Secret("atomist://some_secret")
    public subSecret: string;

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

@CommandHandler("description", [ "universal", "generator" ])
@Tags("universal", "generator")
export class TagsAndIntent implements HandleCommand {

    public handle(context: HandlerContext): Promise<HandlerResult> {
        throw new Error("not relevant");
    }
}

export class NoDecoratorCommandHandler implements HandleCommand, CommandHandlerMetadata {

    protected static params() {
        return [ { name: "foo", description: "Some param", required: false, pattern: /^.*$/.source } ];
    }

    public name = "NoDecoratorCommandHandler";
    public description = "Some description";
    public tags = [];
    public parameters = NoDecoratorCommandHandler.params();

    public handle(context: HandlerContext): Promise<HandlerResult> {
        throw new Error("not relevant");
    }
}

export class NoDecoratorCommandHandlerSubClass extends NoDecoratorCommandHandler implements
    HandleCommand, CommandHandlerMetadata {

    protected static params() {
        return [ ...NoDecoratorCommandHandler.params(),
            { name: "bar", description: "Some param", required: false, pattern: /^.*$/.source } ];
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

export class NoDecoratorIngestor implements HandleEvent<any>, IngestorMetadata {

    public name = "NoDecoratorEventHandler";
    public description = "Some description";
    public tags = [];
    public route = "someFoo";

    public handle(event: EventFired<any>, context: HandlerContext): Promise<HandlerResult> {
        throw new Error("not relevant");
    }
}
