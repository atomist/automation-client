import { render, SlackMessage } from "@atomist/slack-messages/SlackMessages";
import { isSlackMessage, MessageClient, MessageOptions } from "../../spi/message/MessageClient";
import { MessageClientSupport } from "../../spi/message/MessageClientSupport";
import { logger } from "../util/logger";

/**
 * Clearly display messages with channels and recipients (if DMs) on the console.
 */
export class ConsoleMessageClient extends MessageClientSupport implements MessageClient {

    protected async doSend(msg: string | SlackMessage, team: string, users: string | string[],
                           channels: string | string[], options?: MessageOptions) {
        let s = "";
        if (channels && channels.length > 0) {
            if (Array.isArray(channels)) {
                s += channels
                    .map(n => "#" + n)
                    .join(", ")
                    + " ";
            } else {
                s += "#" + channels;
            }
        }
        if (users && users.length > 0) {
            if (Array.isArray(users)) {
                s += users
                    .map(n => "@" + n)
                    .join(", ")
                    + " ";
            } else {
                s += "@" + users;
            }
        }

        if (isSlackMessage(msg)) {
            s += `@atomist: ${render(msg, true)}`;
        } else {
            s += `@atomist: ${msg}`;
        }

        logger.info(s);
    }
}

export const consoleMessageClient = new ConsoleMessageClient();
