import { SlackMessage } from "@atomist/slack-messages/SlackMessages";
import { AbstractScriptedFlushable } from "../../internal/common/AbstractScriptedFlushable";
import { MessageClient, MessageOptions } from "./MessageClient";

export abstract class MessageClientSupport extends AbstractScriptedFlushable<MessageClient>
    implements MessageClient {

    public respond(msg: string | SlackMessage, options?: MessageOptions): Promise<any> {
        return this.doSend(msg, [], [], options);
    }

    public addressUsers(msg: string | SlackMessage, userNames: string | string[],
                        options?: MessageOptions): Promise<any> {
        return this.doSend(msg, userNames, [], options);
    }

    public addressChannels(msg: string | SlackMessage, channelNames: string | string[],
                           options?: MessageOptions): Promise<any> {
        return this.doSend(msg, [], channelNames, options);
    }

    public recordRespond(msg: string | SlackMessage, options?: MessageOptions): this {
        return this.recordAction(ms => ms.respond(msg, options));
    }

    public recordAddressUsers(msg: string | SlackMessage, userNames: string | string[],
                              options?: MessageOptions): this {
        return this.recordAction(ms => ms.addressUsers(msg, userNames, options));
    }

    public recordAddressChannels(msg: string | SlackMessage, channelNames: string | string[],
                                 options?: MessageOptions): this {
        return this.recordAction(ms => ms.addressChannels(msg, channelNames, options));
    }

    protected abstract doSend(msg: string | SlackMessage, userNames: string | string[],
                              channelNames: string | string[], options?: MessageOptions): Promise<any>;

}
