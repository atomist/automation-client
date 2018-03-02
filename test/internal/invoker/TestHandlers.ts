import { HandleCommand } from "../../../src/HandleCommand";
import { HandlerContext } from "../../../src/HandlerContext";

import * as assert from "power-assert";
import {
    CommandHandler, EventHandler, MappedParameter, Parameter, Secret,
    Tags,
} from "../../../src/decorators";
import { EventFired, HandleEvent } from "../../../src/HandleEvent";
import { HandlerResult } from "../../../src/HandlerResult";
import { MappedParameters, Secrets } from "../../../src/index";

@CommandHandler("add the Atomist Spring Boot agent to a Spring Boot project")
@Tags("atomist", "spring")
export class AddAtomistSpringAgent implements HandleCommand {

    @Parameter({
        displayName: "Slack Team ID",
        description: "team identifier for Slack team associated with this repo",
        pattern: /^T[0-9A-Z]+$/,
        validInput: "Slack team identifier of form T0123WXYZ",
        required: true,
    })
    public slackTeam: string;

    @MappedParameter("atomist://github_url")
    public githubWebUrl: string;

    @MappedParameter(MappedParameters.GitHubRepository)
    public repo: string;

    @Secret("atomist://some_secret")
    public someSecret: string;

    public handle(context: HandlerContext) {
        console.log(`Invocation with team [${this.slackTeam}]`);
        assert(this.someSecret);
        assert(this.slackTeam);
        assert(this.repo !== undefined,
            `this.repo=[${this.repo}],this.slackTeam=[${this.slackTeam}],this.githubWebUrl=[${this.githubWebUrl}]`);
        return Promise.resolve({ code: 0 });
    }
}

@EventHandler("Always returns OK", "subscription Foo { Issue { name } }")
@Tags("thing")
export class AlwaysOkEventHandler implements HandleEvent<any> {

    public handle(e: EventFired<any>, ctx: HandlerContext): Promise<HandlerResult> {
        return Promise.resolve({ code: 0, thing: e.data.Thing[0].some_thing });
    }
}

@EventHandler("OK only if mySecret is populated", "subscription Foo { Issue { name } }")
@Tags("thing")
export class TrustMeIGaveMySecret implements HandleEvent<any> {

    @Secret(Secrets.OrgToken)
    private mySecret: string;

    public handle(e: EventFired<any>, ctx: HandlerContext, params: this): Promise<HandlerResult> {
        assert(params.mySecret === "valid");
        return Promise.resolve({ code: 0, thing: e.data.Thing[0].some_thing });
    }
}

@EventHandler("Always returns OK", "subscription Foo {Issue { name }}")
@Tags("thing")
export class FooBarEventHandler implements HandleEvent<any> {

    public handle(e: EventFired<any>, ctx: HandlerContext): Promise<HandlerResult> {
        return Promise.resolve({ code: 0, thing: +e.data.Thing[0].some_thing + 1 });
    }
}
