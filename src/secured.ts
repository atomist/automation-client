import { SlackMessage } from "@atomist/slack-messages/SlackMessages";
import axios from "axios";
import * as _ from "lodash";
import {
    MappedParameters,
    Secrets,
} from "./decorators";
import { HandleCommand } from "./HandleCommand";
import { HandlerContext } from "./HandlerContext";
import { HandlerResult } from "./HandlerResult";
import {
    declareMappedParameter,
    declareSecret,
} from "./internal/metadata/decoratorSupport";
import {
    Maker,
    toFactory,
} from "./util/constructionUtils";

const UnAuthorizedResult = Promise.resolve({ code: 403, message: "Access denied" });

/**
 * Protect the given HandleCommand by only allowing access for certain slack users
 * @param {Maker<HandleCommand>} maker
 * @param {string} users
 * @returns {() => HandleCommand}
 */
export function slackUser(maker: Maker<HandleCommand>, ...users: string[]): () => HandleCommand {
    return () => {
        const command = toFactory(maker)();
        declareMappedParameter(command, "__atomist_slack_user_name", MappedParameters.SlackUserName, true);
        const handleMethod = command.handle;
        command.handle = (ctx: HandlerContext) => {
            if (users.indexOf((command as any).__atomist_slack_user_name) < 0) {
                return UnAuthorizedResult;
            } else {
                return handleMethod.bind(command)(ctx);
            }
        };
        return command;
    };
}

/**
 * Protect the given HandleCommand by only allowing members of a certain GitHub Organization
 * @param {Maker<HandleCommand>} maker
 * @param {string} team
 * @returns {() => HandleCommand}
 */
export function githubOrg(maker: Maker<HandleCommand>, org: string): () => HandleCommand {
    return () => {
        const command = toFactory(maker)();
        declareMappedParameter(command, "__atomist_github_login", MappedParameters.GitHubUserLogin, false);
        declareSecret(command, "__atomist_user_token", Secrets.userToken("read:org"));
        const handleMethod = command.handle;
        command.handle = (ctx: HandlerContext) => {

            const login = (command as any).__atomist_github_login;
            const token = (command as any).__atomist_user_token;

            if (!login) {
                return sendUnauthorized(ctx);
            }

            return isGitHubOrgMember(org, login, token)
                .then(isOrgMember => {
                    if (isOrgMember === true) {
                        return handleMethod.bind(command)(ctx);
                    } else {
                        return sendUnauthorized(ctx);
                    }
                })
                .catch(err => {
                    return sendUnauthorized(ctx);
                });
        };
        return command;
    };
}

function isGitHubOrgMember(org: string, login: string, token: string): Promise<boolean> {
    if (login) {

        const config = {
            headers: {
                Authorization: `token ${token}`,
                Accept: "application/vnd.github.hellcat-preview+json",
            },
        };

        return axios.get(`https://api.github.com/orgs/${org}/members/${login}`, config)
            .then(result => {
                return result.status === 204;
            })
            .catch(() => {
                return false;
            });
    } else {
        return Promise.resolve(false);
    }
}

const ProviderForOrgQuery = `query ProviderForOrg($owner: String!) {
  Org(owner: $owner) {
    provider {
      providerType
    }
  }
}
`;

/**
 * Protect the given HandleCommand by only allowing members of a certain GitHub team
 * @param {Maker<HandleCommand>} maker
 * @param {string} team
 * @returns {() => HandleCommand}
 */
export function githubTeam(maker: Maker<HandleCommand>, gTeam: string): () => HandleCommand {
    return () => {
        const command = toFactory(maker)();
        declareMappedParameter(command, "__atomist_github_owner", MappedParameters.GitHubOwner, false);
        declareMappedParameter(command, "__atomist_github_login", MappedParameters.GitHubUserLogin, false);
        declareSecret(command, "__atomist_user_token", Secrets.userToken("read:org"));
        const handleMethod = command.handle;
        command.handle = (ctx: HandlerContext) => {

            const owner = (command as any).__atomist_github_owner;
            const login = (command as any).__atomist_github_login;
            const token = (command as any).__atomist_user_token;

            if (!owner) {
                return sendUnauthorized(ctx);
            }

            return ctx.graphClient.query<any, any>({
                    query: ProviderForOrgQuery,
                    variables: {
                        owner,
                    },
                })
                .then(providerResult => {

                    const provider = _.get(providerResult, "Org[0].provider.providerType");

                    if (provider === "github_com" || provider === "ghe") {
                        if (!owner || !login) {
                            return sendUnauthorized(ctx);
                        }

                        return isGitHubTeamMember(owner, login, gTeam, token)
                            .then(isTeamMember => {
                                if (isTeamMember === true) {
                                    return handleMethod.bind(command)(ctx);
                                } else {
                                    return sendUnauthorized(ctx);
                                }
                            })
                            .catch(err => {
                                return sendUnauthorized(ctx);
                            });

                    } else {
                        return handleMethod.bind(command)(ctx);
                    }
                });
        };
        return command;
    };
}

function isGitHubTeamMember(owner: string, login: string, team: string, token: string): Promise<boolean> {
    if (login) {

        const config = {
            headers: {
                Authorization: `token ${token}`,
                Accept: "application/vnd.github.hellcat-preview+json",
            },
        };

        return axios.get(`https://api.github.com/orgs/${owner}/teams`, config)
            .then(gitHubTeams => {
                return gitHubTeams.data.find(t => t.name === team);
            })
            .then(gitHubTeam => {
                if (gitHubTeam) {
                    return axios.get(
                        `https://api.github.com/teams/${gitHubTeam.id}/memberships/${login}`,
                        config)
                        .then(() => {
                            return true;
                        })
                        .catch(() => {
                            return false;
                        });
                } else {
                    return false;
                }
            })
            .catch(() => {
                return false;
            });
    } else {
        return Promise.resolve(false);
    }
}

function sendUnauthorized(ctx: HandlerContext): Promise<HandlerResult> {
    const msg: SlackMessage = {
        attachments: [{
            author_icon: `https://images.atomist.com/rug/cross-circle.png`,
            author_name: "Unauthorized to run command",
            fallback: "Unauthorized",
            color: "#D94649",
            footer: `Correlation ID: ${ctx.invocationId}`,
        }],
    };
    return ctx.messageClient.respond(msg)
        .then(() => UnAuthorizedResult);
}
