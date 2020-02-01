import { eventStore } from "../../globals";
import { AutomationEventListenerSupport } from "../../server/AutomationEventListener";
import {
    CommandIncoming,
    EventIncoming,
} from "./RequestProcessor";

export class EventStoringAutomationEventListener extends AutomationEventListenerSupport {

    public async commandIncoming(payload: CommandIncoming) {
        eventStore().recordCommand(payload);
    }

    public async eventIncoming(payload: EventIncoming) {
        eventStore().recordEvent(payload);
    }
}
