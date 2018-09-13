import axios from "axios";
import {
    EventHandler,
    Secret,
    Secrets,
    Value,
} from "../../lib/decorators";
import {
    EventFired,
    HandleEvent,
} from "../../lib/HandleEvent";
import { HandlerContext } from "../../lib/HandlerContext";
import { HandlerResult } from "../../lib/HandlerResult";
import { EventHandlerMetadata } from "../../lib/metadata/automationMetadata";
import {
    addressSlackChannels,
    addressSlackChannelsFromContext,
} from "../../lib/spi/message/MessageClient";

@EventHandler("Notify channel on new issue", `subscription BlaBla
{
  Issue {
    number
    title
    repo {
      owner
      name
      channels {
        name
      }
      org {
        provider {
          apiUrl
        }
      }
    }
  }
}`)
export class HelloIssue implements HandleEvent<any> {

    @Secret(Secrets.OrgToken)
    public githubToken: string;

    @Value("http.port")
    public port: number;

    public async handle(e: EventFired<any>, ctx: HandlerContext): Promise<HandlerResult> {

        const issue = e.data.Issue[0];
        let apiUrl = "https://api.github.com/";
        if (issue.repo.org.provider) {
            apiUrl = issue.repo.org.provider.apiUrl;
        }

        return ctx.messageClient.send(`Got a new issue \`${issue.number}# ${issue.title}\``,
            await addressSlackChannelsFromContext(ctx, ...issue.repo.channels.map(c => c.name)))
            .then(() => {
                return axios.post(
                    `${apiUrl}repos/${issue.repo.owner}/${issue.repo.name}/issues/${issue.number}/comments`,
                    { body: "Hey, I saw your issue!" },
                    { headers: { Authorization: `token ${this.githubToken}` } });
            })
            .then(() => {
                return Promise.resolve({ code: 0 });
            });
    }
}

export class HelloIssueViaProperties implements HandleEvent<any>, EventHandlerMetadata {

    public name = "HelloIssueViaProperties";
    public description = "";
    public subscriptionName = "BlaBla";
    public subscription = `subscription BlaBla
{
  Issue {
    number
    title
    repo {
      owner
      name
      channels {
        name
      }
      org {
        provider {
          apiUrl
        }
      }
    }
  }
}`;

    public handle(e: EventFired<any>, ctx: HandlerContext): Promise<HandlerResult> {
        console.log(e);
        return null;
    }
}
