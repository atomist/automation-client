import { SlackMessage } from "@atomist/slack-messages";
import { ApolloGraphClient } from "../../../graph/ApolloGraphClient";
import {
    AutomationContextAware,
    HandlerContext,
} from "../../../HandlerContext";
import { AutomationEventListener } from "../../../server/AutomationEventListener";
import { AutomationServer } from "../../../server/AutomationServer";
import { GraphClient } from "../../../spi/graph/GraphClient";
import {
    Destination,
    MessageClient,
    MessageOptions,
} from "../../../spi/message/MessageClient";
import { MessageClientSupport } from "../../../spi/message/MessageClientSupport";
import * as namespace from "../../util/cls";
import { AbstractRequestProcessor } from "../AbstractRequestProcessor";
import {
    CommandIncoming,
    EventIncoming,
} from "../RequestProcessor";
import { ExpressServerOptions } from "./ExpressServer";

/**
 * RequestProcessor implementation used by the Express infrastructure to process
 * inbound events via HTTP REST apis.
 */
export class ExpressRequestProcessor extends AbstractRequestProcessor {

    private messages: any[] = [];

    constructor(private token: string,
                protected automations: AutomationServer,
                protected listeners: AutomationEventListener[] = [],
                private options: ExpressServerOptions) {
        super(automations, listeners);
    }

    protected sendStatusMessage(payload: any, ctx: HandlerContext & AutomationContextAware): Promise<any> {
        return Promise.resolve();
    }

    protected createGraphClient(event: EventIncoming | CommandIncoming,
                                context: AutomationContextAware): GraphClient {
        const teamId = namespace.get().teamId;
        return new ApolloGraphClient(`${this.options.endpoint.graphql}/${teamId}`,
            { Authorization: `token ${this.token}` });
    }

    protected createMessageClient(event: EventIncoming | CommandIncoming,
                                  context: AutomationContextAware): MessageClient {
        return new ExpressMessageClient(this.messages);
    }
}

class ExpressMessageClient extends MessageClientSupport {

    constructor(private messages: any[]) {
        super();
    }

    protected doSend(msg: string | SlackMessage,
                     destinations: Destination | Destination[],
                     options?: MessageOptions): Promise<any> {
         this.messages.push(msg);
         return Promise.resolve();
    }
}
