import { bold, SlackMessage, url } from "@atomist/slack-messages/SlackMessages";
import {
    EventFired,
    EventHandler,
    failure,
    HandleEvent,
    HandlerContext,
    HandlerResult,
    Success,
} from "../../src/index";
import { addressSlackChannels } from "../../src/spi/message/MessageClient";

@EventHandler("Notify on GitLab pushes", `subscription GitLabPush {
  GitLabPush {
    id
    user_username
    user_avatar
    repository {
      name
      git_http_url
    }
    commits {
      id
      url
      message
      author {
        name
        email
      }
    }
  }
}
`)
export class GitLabPush implements HandleEvent<any> {

    public handle(e: EventFired<any>, ctx: HandlerContext): Promise<HandlerResult> {
        const push = e.data.GitLabPush[0];
        const text = `${push.commits.length} new ${(push.commits.length > 1 ? "commits" : "commit")} ` +
            `to ${bold(url(push.repository.git_http_url, `${push.user_username}/${push.repository.name}/master`))}`;
        const msg: SlackMessage = {
            text,
            attachments: [{
                fallback: text,
                author_name: `@${push.user_username}`,
                author_icon: push.user_avatar,
                text: push.commits.map(c => `\`${url(c.url, c.id.slice(0, 7))}\` ${c.message.slice(0, 49)}`).join("\n"),
                mrkdwn_in: ["text"],
                color: "#00a5ff",
            },
            ],
        };
        return ctx.messageClient.send(msg, addressSlackChannels("FIXME", "gitlab"))
            .then(() => Success, failure);
    }
}
