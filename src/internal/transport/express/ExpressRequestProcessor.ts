import { SlackMessage } from "@atomist/slack-messages";
import axios from "axios";
import { ApolloGraphClient } from "../../../graph/ApolloGraphClient";
import { AutomationEventListener } from "../../../server/AutomationEventListener";
import { AutomationServer } from "../../../server/AutomationServer";
import { GraphClient } from "../../../spi/graph/GraphClient";
import {
    MessageClient,
    MessageOptions,
} from "../../../spi/message/MessageClient";
import { MessageClientSupport } from "../../../spi/message/MessageClientSupport";
import * as namespace from "../../util/cls";
import { logger } from "../../util/logger";
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

    constructor(private token: string,
                private payload: CommandIncoming,
                protected automations: AutomationServer,
                protected listeners: AutomationEventListener[] = [],
                private options: ExpressServerOptions) {
        super(automations, listeners);
    }

    protected sendMessage(payload: any) {
        return raiseEvent(payload);
    }

    protected createGraphClient(event: EventIncoming | CommandIncoming): GraphClient {
        const teamId = namespace.get().teamId;
        return new ApolloGraphClient(`${this.options.endpoint.graphql}/${teamId}`,
            { Authorization: `token ${this.token}`});
    }

    protected createMessageClient(event: EventIncoming | CommandIncoming): MessageClient {
        return new ExpressMessageClient();
    }
}

class ExpressMessageClient extends MessageClientSupport {

    protected doSend(msg: string | SlackMessage, userNames: string | string[],
                     channelNames: string | string[], options?: MessageOptions): Promise<any> {
        return raiseEvent(msg);
    }
}

function raiseEvent(payload: any): Promise<any> {
    // TODO cd this url should change
    return axios.put("https://api.atomist.com/dashboard/v1/event", {
            team_id: this.payload.teamId,
            correlation_id: this.payload.corrid,
            message: payload,
        })
        .catch(err => {
            logger.warn(err);
        });
}
