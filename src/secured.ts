import { SlackMessage } from "@atomist/slack-messages/SlackMessages";
import axios from "axios";
import * as _ from "lodash";
import {
    HandleCommand,
    HandlerContext,
    HandlerResult,
    MappedParameters,
    Secrets,
} from "./Handlers";
import {
    declareMappedParameter,
    declareSecret,
} from "./internal/metadata/decoratorSupport";
import {
    Maker,
    toFactory,
} from "./util/constructionUtils";

const GitHubIdQuery = `query ChatId($teamId: ID!, $chatId: String!) {
  ChatTeam(id: $teamId) {
    members(userId: $chatId) {
      person {
        gitHubId {
          login
        }
      }
    }
  }
}`;

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
        declareMappedParameter(command, "__atomist_slack_user_name", MappedParameters.SlackUserName);
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
 * Protect the given HandleCommand by only allowing members of a certain GitHub team
 * @param {Maker<HandleCommand>} maker
 * @param {string} team
 * @returns {() => HandleCommand}
 */
export function githubTeam(maker: Maker<HandleCommand>, team: string): () => HandleCommand {
    return () => {
        const command = toFactory(maker)();
        declareMappedParameter(command, "__atomist_slack_user", MappedParameters.SlackUser);
        declareMappedParameter(command, "__atomist_github_owner", MappedParameters.GitHubOwner);
        declareSecret(command, "__atomist_user_token", Secrets.userToken(["read:org"]));
        const handleMethod = command.handle;
        command.handle = (ctx: HandlerContext) => {

            const user = (command as any).__atomist_slack_user;
            const owner = (command as any).__atomist_github_owner;
            const token = (command as any).__atomist_user_token;

            return ctx.graphClient.executeQuery(GitHubIdQuery,
                { teamId: ctx.teamId, chatId: user })
                .then(result => {
                    const login = _.get(result, "ChatTeam[0].members[0].person.gitHubId.login");

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
                                            return handleMethod.bind(command)(ctx);
                                        })
                                        .catch(() => {
                                            return sendUnauthorized(ctx);
                                        });
                                } else {
                                    return sendUnauthorized(ctx);
                                }
                            })
                            .catch(() => {
                                return sendUnauthorized(ctx);
                            });
                    } else {
                        return sendUnauthorized(ctx);
                    }
                });
        };
        return command;
    };
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
