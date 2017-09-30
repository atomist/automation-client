import { SlackMessage } from "@atomist/slack-messages/SlackMessages";
import { eventStore } from "../../globals";
import { AutomationEventListener } from "../../server/AutomationEventListener";
import { AutomationServer } from "../../server/AutomationServer";
import { MessageClient, MessageOptions } from "../../spi/message/MessageClient";
import { MessageClientSupport } from "../../spi/message/MessageClientSupport";
import { guid } from "../util/string";
import { AbstractTransportEventHandler } from "./AbstractTransportEventHandler";
import { CommandIncoming, EventIncoming } from "./TransportEventHandler";

export abstract class AbstractEventStoringTransportEventHandler extends AbstractTransportEventHandler {

    constructor(protected automations: AutomationServer, protected listeners: AutomationEventListener[] = []) {
        super(automations, listeners);
    }

    public createMessageClient(event: EventIncoming | CommandIncoming): MessageClient {
        return new WrappingMessageClient(this.doCreateMessageClient(event));
    }

    protected onCommandWithContext(command: CommandIncoming) {
        eventStore().recordCommand(command);
    }

    protected onEventWithContext(event: EventIncoming) {
        eventStore().recordEvent(event);
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
                    eventStore().recordMessage(guid(), msg);
                    return msg;
                });
        } else {
            return this.messageClient.addressChannels(message, channelNames, options)
                .then(msg => {
                    eventStore().recordMessage(guid(), msg);
                    return msg;
                });
        }
    }
}
