import { SlackMessage } from "@atomist/slack-messages/SlackMessages";
import { HandlerResult } from "../../HandlerResult";
import { AutomationServer } from "../../server/AutomationServer";
import { MessageClient, MessageOptions } from "../../spi/message/MessageClient";
import { MessageClientSupport } from "../../spi/message/MessageClientSupport";
import { eventStore } from "../event/InMemoryEventStore";
import { guid } from "../util/string";
import { AbstractAutomationEventListener } from "./AbstractAutomationEventListener";
import { CommandIncoming, EventIncoming } from "./AutomationEventListener";

export abstract class AbstractEventStoringAutomationEventListener extends AbstractAutomationEventListener {

    constructor(protected automations: AutomationServer) {
        super(automations);
    }

    public onCommand(command: CommandIncoming): Promise<HandlerResult> {
        eventStore.recordCommand(command);
        return super.onCommand(command);
    }

    public onEvent(event: EventIncoming): Promise<HandlerResult[]> {
        eventStore.recordEvent(event);
        return super.onEvent(event);
    }

    public createMessageClient(event: EventIncoming | CommandIncoming): MessageClient {
        return new WrappingMessageClient(this.doCreateMessageClient(event));
    }

    protected abstract doCreateMessageClient(event: EventIncoming | CommandIncoming): MessageClient;
}

class WrappingMessageClient extends MessageClientSupport {

    constructor(private messageClient: MessageClient) {
        super();
    }

    protected doSend(message: string | SlackMessage, userNames: string | string[],
                     channelNames: string | string[], options?: MessageOptions) {
        if (userNames && userNames.length > 0) {
            return this.messageClient.addressUsers(message, userNames, options)
                .then(msg => {
                    eventStore.recordMessage(guid(), msg);
                    return msg;
                });
        } else {
            return this.messageClient.addressChannels(message, channelNames, options)
                .then(msg => {
                    eventStore.recordMessage(guid(), msg);
                    return msg;
                });
        }
    }
}
