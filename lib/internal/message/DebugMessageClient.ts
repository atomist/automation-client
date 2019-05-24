import * as stringify from "json-stringify-safe";
import {
    Destination,
    MessageClient,
    RequiredMessageOptions,
} from "../../spi/message/MessageClient";
import { MessageClientSupport } from "../../spi/message/MessageClientSupport";
import { logger } from "../../util/logger";

export class DebugMessageClient extends MessageClientSupport implements MessageClient {

    public async delete(destinations: Destination | Destination[],
                        options: RequiredMessageOptions): Promise<void> {
    }

    protected async doSend(message): Promise<void> {
        logger.info(`Message\n${stringify(message, null, 2)}`);
    }
}

export const debugMessageClient = new DebugMessageClient();
