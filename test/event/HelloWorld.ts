import { EventHandler } from "../../src/decorators";
import {
    EventFired,
    HandleEvent,
} from "../../src/HandleEvent";
import { HandlerContext } from "../../src/HandlerContext";
import {
    HandlerResult,
    SuccessPromise,
} from "../../src/HandlerResult";

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
