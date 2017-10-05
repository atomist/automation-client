import { SlackMessage } from "@atomist/slack-messages/SlackMessages";
import { eventStore } from "../../globals";
import { AutomationEventListener } from "../../server/AutomationEventListener";
import { AutomationServer } from "../../server/AutomationServer";
import { MessageClient, MessageOptions } from "../../spi/message/MessageClient";
import { MessageClientSupport } from "../../spi/message/MessageClientSupport";
import { guid } from "../util/string";
import { AbstractRequestProcessor } from "./AbstractRequestProcessor";
import { CommandIncoming, EventIncoming } from "./RequestProcessor";

export abstract class AbstractEventStoringRequestProcessor extends AbstractRequestProcessor {

    constructor(protected automations: AutomationServer, protected listeners: AutomationEventListener[] = []) {
        super(automations, listeners);
    }

    public createMessageClient(event: EventIncoming | CommandIncoming): MessageClient {
        return new WrappingMessageClient(this.doCreateMessageClient(event));
    }

    protected onCommandWithNamespace(command: CommandIncoming) {
        eventStore().recordCommand(command);
    }

    protected onEventWithNamespace(event: EventIncoming) {
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
