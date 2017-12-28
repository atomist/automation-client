import axios from "axios";
import {
    EventFired,
    EventHandler,
    HandleEvent,
    HandlerContext,
    HandlerResult,
    Secret, Secrets,
} from "../../src/index";

@EventHandler("Notify channel on new issue", `subscription HelloIssue
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

    public handle(e: EventFired<any>, ctx: HandlerContext): Promise<HandlerResult> {

        const issue = e.data.Issue[0];
        let apiUrl = "https://api.github.com/";
        if (issue.repo.org.provider) {
            apiUrl = issue.repo.org.provider.api_url;
        }

        return ctx.messageClient.addressChannels(`Got a new issue \`${issue.number}# ${issue.title}\``,
            "FIXME", issue.repo.channels.map(c => c.name))
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
