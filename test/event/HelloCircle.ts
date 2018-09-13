import { EventHandler } from "../../lib/decorators";
import {
    EventFired,
    HandleEvent,
} from "../../lib/HandleEvent";
import { HandlerContext } from "../../lib/HandlerContext";
import {
    failure,
    HandlerResult,
    Success,
} from "../../lib/HandlerResult";
import { addressSlackChannels } from "../../lib/spi/message/MessageClient";

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
