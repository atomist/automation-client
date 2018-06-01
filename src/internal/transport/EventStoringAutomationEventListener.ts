import { SlackMessage } from "@atomist/slack-messages/SlackMessages";
import { eventStore } from "../../globals";
import { HandlerContext } from "../../HandlerContext";
import { AutomationEventListenerSupport } from "../../server/AutomationEventListener";
import {
    Destination,
    MessageOptions,
} from "../../spi/message/MessageClient";
import { guid } from "../util/string";
import {
    CommandIncoming,
    EventIncoming,
} from "./RequestProcessor";

export class EventStoringAutomationEventListener extends AutomationEventListenerSupport {

    public commandIncoming(payload: CommandIncoming) {
        eventStore().recordCommand(payload);
    }

    public eventIncoming(payload: EventIncoming) {
        eventStore().recordEvent(payload);
    }

    public messageSent(message: string | SlackMessage,
                       destinations: Destination | Destination[],
                       options: MessageOptions,
                       ctx: HandlerContext) {
        eventStore().recordMessage(options && options.id ? options.id : guid(), ctx.correlationId, message);
        return Promise.resolve();
    }
}
