import { user } from "@atomist/slack-messages/SlackMessages";
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

@EventHandler("Notify on Circle CI events", `subscription HelloCircle
{
  CircleCIPayload {
    id
    payload {
      build_num
      vcs_revision
      reponame
      branch
    }
  }
}`)
export class HelloCircle implements HandleEvent<any> {

    public handle(e: EventFired<any>, ctx: HandlerContext): Promise<HandlerResult> {
        const b = e.data.CircleCIPayload[0];
        return ctx.messageClient.send(`*#${b.payload.build_num} ${b.payload.reponame}*`,
            addressSlackChannels("FIXME", "general"))
            .then(() => Success, failure);
    }
}
