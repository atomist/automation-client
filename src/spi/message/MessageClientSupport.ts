import { SlackMessage } from "@atomist/slack-messages/SlackMessages";
import { MessageClient, MessageOptions } from "./MessageClient";

export abstract class MessageClientSupport implements MessageClient {

    public respond(msg: string | SlackMessage,
                   options?: MessageOptions): Promise<any> {
        return this.doSend(msg, null, [], [], options);
    }

    public addressUsers(msg: string | SlackMessage,
                        team: string,
                        users: string | string[],
                        options?: MessageOptions): Promise<any> {
        return this.doSend(msg, team, users, [], options);
    }

    public addressChannels(msg: string | SlackMessage,
                           team: string,
                           channels: string | string[],
                           options?: MessageOptions): Promise<any> {
        return this.doSend(msg, team, [], channels, options);
    }

    protected abstract doSend(msg: string | SlackMessage,
                              team: string,
                              users: string | string[],
                              channels: string | string[],
                              options?: MessageOptions): Promise<any>;

}
