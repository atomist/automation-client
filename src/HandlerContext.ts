
import { Contextual } from "./internal/invoker/Payload";
import { AutomationContext } from "./internal/util/cls";
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

/**
 * Context of the currently running automation.
 */
export interface AutomationContextAware {

    context: AutomationContext;
}
