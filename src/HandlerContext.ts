import { Contextual } from "./internal/invoker/Payload";
import {
    CommandIncoming,
    EventIncoming,
} from "./internal/transport/RequestProcessor";
import { AutomationContext } from "./internal/util/cls";
import { GraphClient } from "./spi/graph/GraphClient";
import {
    MessageClient,
    SlackMessageClient,
} from "./spi/message/MessageClient";

/**
 * Context available to all handlers
 */
export interface HandlerContext extends Contextual {

    /**
     * Client to use for GraphQL queries
     */
    graphClient?: GraphClient;

    /**
     * Client to send messages
     */
    messageClient: MessageClient & SlackMessageClient;

    /**
     * Provides access to the lifecycle of a handler and context
     */
    lifecycle?: HandlerLifecycle;

}

/**
 * Context of the currently running automation
 */
export interface AutomationContextAware {

    context: AutomationContext;

    trigger: CommandIncoming | EventIncoming;
}

/**
 * Lifecycle of the handler and its context
 */
export interface HandlerLifecycle {

    /**
     * Register a callback that should be invoked when this context gets disposed
     * @param {() => Promise<void>} callback
     * @param {string} description
     */
    registerDisposable(callback: () => Promise<void>, description?: string): void;

    /**
     * Disposes the HandlerContext.
     * Before disposing the context, this will invoke all registered disposables
     * @returns {Promise<any>}
     */
    dispose(): Promise<void>;
}
