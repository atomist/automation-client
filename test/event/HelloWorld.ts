import { EventHandler } from "../../lib/decorators";
import {
    EventFired,
    HandleEvent,
} from "../../lib/HandleEvent";
import { HandlerContext } from "../../lib/HandlerContext";
import {
    HandlerResult,
    SuccessPromise,
} from "../../lib/HandlerResult";

@EventHandler("Receive HelloWorlds via http ingestion", `
subscription HelloWorldIngester {
  HelloWorld {
    id
    sender {
      name
    }
    recipient {
      name
    }
  }
}
`)
export class HelloWorldIngester implements HandleEvent<any> {
    public handle(e: EventFired<any>, ctx: HandlerContext): Promise<HandlerResult> {
        console.log(JSON.stringify(e.data));
        return SuccessPromise;
    }
}
