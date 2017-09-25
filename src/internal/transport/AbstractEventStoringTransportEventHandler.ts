import { SlackMessage } from "@atomist/slack-messages/SlackMessages";
import { HandlerResult } from "../../HandlerResult";
import { AutomationEventListener } from "../../server/AutomationEventListener";
import { AutomationServer } from "../../server/AutomationServer";
import { eventStore } from "../../spi/event/EventStore";
import { MessageClient, MessageOptions } from "../../spi/message/MessageClient";
import { MessageClientSupport } from "../../spi/message/MessageClientSupport";
import { guid } from "../util/string";
import { AbstractTransportEventHandler } from "./AbstractTransportEventHandler";
import { CommandIncoming, EventIncoming } from "./TransportEventHandler";

export abstract class AbstractEventStoringTransportEventHandler extends AbstractTransportEventHandler {

    constructor(protected automations: AutomationServer, protected listeners: AutomationEventListener[] = []) {
        super(automations, listeners);
    }

    public onCommand(command: CommandIncoming): Promise<HandlerResult> {
        eventStore().recordCommand(command);
        return super.onCommand(command);
    }

    public onEvent(event: EventIncoming): Promise<HandlerResult[]> {
        eventStore().recordEvent(event);
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
