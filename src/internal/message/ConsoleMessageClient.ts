import { render } from "@atomist/slack-messages/SlackMessages";
import {
    Destination,
    isSlackMessage,
    MessageClient,
    MessageOptions,
} from "../../spi/message/MessageClient";
import { DefaultSlackMessageClient, MessageClientSupport } from "../../spi/message/MessageClientSupport";
import { logger } from "../util/logger";

/**
 * Clearly display messages with channels and recipients (if DMs) on the console.
 */
export class ConsoleMessageClient extends MessageClientSupport implements MessageClient {

    protected async doSend(msg: any,
                           destinations: Destination | Destination[],
                           options?: MessageOptions) {
        let s = "";

        if (isSlackMessage(msg)) {
            s += `@atomist: ${render(msg, true)}`;
        } else {
            s += `@atomist: ${msg}`;
        }

        logger.info(s);
    }
}

export const consoleMessageClient = new DefaultSlackMessageClient(new ConsoleMessageClient(), null);
