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
        return raiseEvent(payload, this.payload);
    }

    protected createGraphClient(event: EventIncoming | CommandIncoming): GraphClient {
        const teamId = namespace.get().teamId;
        return new ApolloGraphClient(`${this.options.endpoint.graphql}/${teamId}`,
            { Authorization: `token ${this.token}`});
    }

    protected createMessageClient(event: EventIncoming | CommandIncoming): MessageClient {
        return new ExpressMessageClient(this.payload);
    }
}

class ExpressMessageClient extends MessageClientSupport {

    constructor(private payload: CommandIncoming) {
        super();
    }

    protected doSend(msg: string | SlackMessage, userNames: string | string[],
                     channelNames: string | string[], options?: MessageOptions): Promise<any> {
        return raiseEvent(msg, this.payload);
    }
}

function raiseEvent(payload: any, incomingPayload: CommandIncoming): Promise<any> {
    // TODO cd this url should change
    return axios.put("https://api.atomist.com/dashboard/v1/event", {
            team_id: incomingPayload.team.id,
            correlation_id: incomingPayload.corrid,
            message: payload,
        })
        .catch(err => {
            logger.warn(err);
        });
}
