import { HandleCommand } from "./HandleCommand";
import { HandlerContext } from "./HandlerContext";
import { Failure, HandlerResult, Success } from "./HandlerResult";

import { CommandHandler, EventHandler, MappedParameter, Parameter, Secret, Tags } from "./decorators";
import { EventFired, HandleEvent } from "./HandleEvent";

export { HandlerResult, HandlerContext, HandleCommand, Success, Failure };
export { HandleEvent, EventFired };
export { EventHandler, Parameter, CommandHandler, MappedParameter, Secret, Tags };

export abstract class MappedParameters {
    public static readonly CORRELATION_ID: string = "atomist://correlation_id";

    public static readonly GITHUB_REPO_OWNER: string = "atomist://github/repository/owner";
    public static readonly GITHUB_OWNER: string = "atomist://github/repository/owner";
    public static readonly GITHUB_REPOSITORY: string = "atomist://github/repository";
    public static readonly GITHUB_WEBHOOK_URL: string = "atomist://github_webhook_url";
    public static readonly GITHUB_URL: string = "atomist://github_url";
    public static readonly GITHUB_API_URL: string = "atomist://github_api_url";
    public static readonly GITHUB_DEFAULT_REPO_VISIBILITY: string = "atomist://github/default_repo_visibility";

    public static readonly SLACK_CHANNEL: string = "atomist://slack/channel";
    public static readonly SLACK_CHANNEL_NAME: string = "atomist://slack/channel_name";
    public static readonly SLACK_TEAM: string = "atomist://slack/team";
    public static readonly SLACK_USER: string = "atomist://slack/user";
    public static readonly SLACK_USER_NAME: string = "atomist://slack/user_name";
}

export abstract class Secrets {
    public static readonly ORG_TOKEN: string = "github://org_token";
    public static readonly USER_TOKEN: string = "github://user_token";

    public static userToken(scopes: string[]): string {
        if (scopes && scopes.length > 0) {
            return `${this.USER_TOKEN}?scopes=${scopes.join(",")}`;
        } else {
            return this.USER_TOKEN;
        }
    }
}
