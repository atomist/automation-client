import {
    BaseParameter,
    declareCommandHandler,
    declareEventHandler,
    declareMappedParameter,
    declareParameter,
    declareParameters,
    declareSecret,
    declareTags,
} from "./internal/metadata/decoratorSupport";
import { toStringArray } from "./internal/util/string";

/**
 * Decorator for parameters. Adds to object properties
 */
export function Parameter(details: BaseParameter = {}) {
    return (target: any, propertyKey: string) => {
        declareParameter(target, propertyKey, details);
    };
}

/**
 * Map a local field to some other configuration item in a different system
 */
export function MappedParameter(foreignKey: string) {
    return (target: any, localKey: string) => {
        declareMappedParameter(target, localKey, foreignKey);
    };
}

/**
 * Declare a secret a Rug wants to use
 */
export function Secret(path: string) {
    return (target: any, name: string) => {
        declareSecret(target, name, path);
    };
}

/**
 * Decorator for a command handler class. Implements HandleCommand
 * @param {string} description
 * @param {string[] | string} intent
 * @return {(obj: any) => any}
 * @constructor
 */
export function CommandHandler(description: string, ...intent: string[]) {
    return (obj: any) => { declareCommandHandler(obj, description, intent); };
}

/**
 * Decorator for a parameter class that doesn't contain handler logic
 * @return {(obj: any) => any}
 * @constructor
 */
export function Parameters() {
    return (obj: any) => { declareParameters(obj); };
}

export function EventHandler(
    description: string,
    subscription?: string) {
    return (obj: object) => {
            declareEventHandler(obj, description, subscription);
    };
}

/**
 * Decorator for tags. Sets tags on the class
 */
export function Tags(...tags: string[]) {
    return (target: any) => {
        declareTags(target, tags);
    };
}

export abstract class MappedParameters {
    public static readonly GitHubOwner: string = "atomist://github/repository/owner";
    public static readonly GitHubRepository: string = "atomist://github/repository";
    public static readonly GitHubWebHookUrl: string = "atomist://github_webhook_url";
    public static readonly GitHubUrl: string = "atomist://github_url";
    public static readonly GitHubApiUrl: string = "atomist://github_api_url";
    public static readonly GitHubDefaultRepositoryVisibility: string = "atomist://github/default_repo_visibility";

    public static readonly SlackChannel: string = "atomist://slack/channel";
    public static readonly SlackChannelName: string = "atomist://slack/channel_name";
    public static readonly SlackTeam: string = "atomist://slack/team";
    public static readonly SlackUser: string = "atomist://slack/user";
    public static readonly SlackUserName: string = "atomist://slack/user_name";
}

export abstract class Secrets {
    public static readonly OrgToken: string = "github://org_token";
    public static readonly UserToken: string = "github://user_token";

    public static userToken(scopes: string | string[]): string {
        scopes = toStringArray(scopes);
        if (scopes && scopes.length > 0) {
            return `${this.UserToken}?scopes=${scopes.join(",")}`;
        } else {
            return this.UserToken;
        }
    }
}
