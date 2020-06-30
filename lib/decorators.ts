import {
    BaseParameter,
    BaseValue,
    declareCommandHandler,
    declareEventHandler,
    declareMappedParameter,
    declareParameter,
    declareParameters,
    declareSecret,
    declareTags,
    declareValue,
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
export function MappedParameter(uri: string, required: boolean = true) {
    return (target: any, name: string) => {
        declareMappedParameter(target, name, uri, required);
    };
}

/**
 * Declare a secret an automation wants to use
 */
export function Secret(uri: string) {
    return (target: any, name: string) => {
        declareSecret(target, name, uri);
    };
}

/**
 * Inject a config value from the automation-client configuration
 */
export function Value(pathOrValue: string | BaseValue) {
    return (target: any, name: string) => {
        if (typeof pathOrValue === "string") {
            declareValue(target, name, {
                path: pathOrValue,
            });
        } else {
            declareValue(target, name, pathOrValue);
        }
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
    return (obj: any) => {
        declareCommandHandler(obj, description, false, intent);
    };
}

/**
 * Decorator for a configurable command handler class. Implements HandleCommand
 * @param {string} description
 * @param {string[] | string} intent
 * @return {(obj: any) => any}
 * @constructor
 */
export function ConfigurableCommandHandler(
    description: string,
    options: { intent?: string | string[]; autoSubmit?: boolean },
) {
    const intent = options.intent ? toStringArray(options.intent) : [];
    const autoSubmit = options.autoSubmit ? options.autoSubmit : false;
    return (obj: any) => {
        declareCommandHandler(obj, description, autoSubmit, intent);
    };
}

/**
 * Decorator for a parameter class that doesn't contain handler logic
 * @return {(obj: any) => any}
 * @constructor
 */
export function Parameters() {
    return (obj: any) => {
        declareParameters(obj);
    };
}

export function EventHandler(description: string, subscription?: string | (() => string)) {
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

export const MappedParameters = {
    GitHubOwner: "atomist://github/repository/owner",
    GitHubOwnerWithUser: "atomist://github/repository/owner?user=true",
    GitHubRepository: "atomist://github/repository",
    GitHubAllRepositories: "atomist://github/repository?all=true",
    GitHubRepositoryProvider: "atomist://github/repository/provider",

    GitHubWebHookUrl: "atomist://github_webhook_url",
    GitHubUrl: "atomist://github_url",
    GitHubApiUrl: "atomist://github_api_url",
    GitHubUserLogin: "atomist://github/username",

    SlackChannel: "atomist://slack/channel",
    SlackChannelName: "atomist://slack/channel_name",
    SlackChannelType: "atomist://slack/channel_type",
    SlackTeam: "atomist://slack/team",
    SlackUser: "atomist://slack/user",
    SlackUserName: "atomist://slack/user_name",

    AtomistWebhookUrlBase: "atomist://base_webhook_url",
};

export enum SlackChannelType {
    Channel = "channel",
    User = "user",
}

export const Secrets = {
    OrgToken: "github://org_token",
    UserToken: "github://user_token",

    userToken: (scopeOrScopes: string | string[]): string => {
        const scopes = toStringArray(scopeOrScopes);
        if (scopes && scopes.length > 0) {
            return `${Secrets.UserToken}?scopes=${scopes.join(",")}`;
        } else {
            return Secrets.UserToken;
        }
    },
};
