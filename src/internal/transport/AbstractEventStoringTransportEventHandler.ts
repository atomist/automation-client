import { SlackMessage } from "@atomist/slack-messages/SlackMessages";
import { eventStore } from "../../globals";
import { HandlerResult } from "../../HandlerResult";
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

    public onCommand(command: CommandIncoming, success?: (results: HandlerResult) => void,
                     // tslint:disable-next-line:no-empty
                     error: (error: any) => void = () => {}) {
        eventStore().recordCommand(command);
        super.onCommand(command, success, error);
    }

    public onEvent(event: EventIncoming, success?: (results: HandlerResult[]) => void,
                   // tslint:disable-next-line:no-empty
                   error: (error: any) => void = () => {}) {
        eventStore().recordEvent(event);
        super.onEvent(event, success, error);
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
