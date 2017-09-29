import { render, SlackMessage } from "@atomist/slack-messages/SlackMessages";
import { isSlackMessage, MessageClient, MessageOptions } from "../../spi/message/MessageClient";
import { MessageClientSupport } from "../../spi/message/MessageClientSupport";
import { logger } from "../util/logger";

/**
 * Clearly display messages with channels and recipients (if DMs) on the console.
 */
export class ConsoleMessageClient extends MessageClientSupport implements MessageClient {

    protected async doSend(msg: string | SlackMessage, userNames: string | string[],
                           channelNames: string | string[], options?: MessageOptions) {
        let s = "";
        if (channelNames && channelNames.length > 0) {
            if (Array.isArray(channelNames)) {
                s += channelNames
                        .map(n => "#" + n)
                        .join(", ")
                    + " ";
            } else {
                s += "#" + channelNames;
            }
        }
        if (userNames && userNames.length > 0) {
            if (Array.isArray(userNames)) {
                s += userNames
                        .map(n => "@" + n)
                        .join(", ")
                    + " ";
            } else {
                s += "@" + userNames;
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
