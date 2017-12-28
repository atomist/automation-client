import { SlackMessage } from "@atomist/slack-messages/SlackMessages";
import { eventStore } from "../../globals";
import { AutomationEventListenerSupport } from "../../server/AutomationEventListener";
import { MessageOptions } from "../../spi/message/MessageClient";
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
                       team: string,
                       users: string | string[],
                       channels: string | string[],
                       options?: MessageOptions) {
        eventStore().recordMessage(options && options.id ? options.id : guid(), message);
    }
}
