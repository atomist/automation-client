
import { Contextual } from "./internal/invoker/Payload";
import { GraphClient } from "./spi/graph/GraphClient";
import { MessageClient } from "./spi/message/MessageClient";

/**
 * Context available to all handlers.
 */
export interface HandlerContext extends Contextual {

    /**
     * Client to use for GraphQL queries
     */
    graphClient?: GraphClient;

    /**
     * Client to send messages
     */
    messageClient: MessageClient;

}
