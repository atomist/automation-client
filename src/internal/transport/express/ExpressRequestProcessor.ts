import { SlackMessage } from "@atomist/slack-messages";
import axios from "axios";
import { ApolloGraphClient } from "../../../graph/ApolloGraphClient";
import {
    AutomationContextAware,
    HandlerContext,
} from "../../../HandlerContext";
import { HandlerResult } from "../../../HandlerResult";
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

    public sendStatus(success: boolean, hr: HandlerResult, request: CommandIncoming) {
        if (success) {
            return raiseEvent(`Successfully invoked ${request.name}`, request, "success");
        } else {
            return raiseEvent(`Unsuccessfully invoked ${request.name}`, request, "failure");
        }
    }

    protected sendStatusMessage(payload: any, ctx: HandlerContext & AutomationContextAware): Promise<any> {
        return Promise.resolve();
    }

    protected createGraphClient(event: EventIncoming | CommandIncoming,
                                context: AutomationContextAware): GraphClient {
        const teamId = namespace.get().teamId;
        return new ApolloGraphClient(`${this.options.endpoint.graphql}/${teamId}`,
            { Authorization: `token ${this.token}`});
    }

    protected createMessageClient(event: EventIncoming | CommandIncoming,
                                  context: AutomationContextAware): MessageClient {
        return new ExpressMessageClient(this.payload);
    }
}

class ExpressMessageClient extends MessageClientSupport {

    constructor(private payload: CommandIncoming) {
        super();
    }

    protected doSend(msg: string | SlackMessage, userNames: string | string[],
                     channelNames: string | string[], options?: MessageOptions): Promise<any> {
        return raiseEvent(msg, this.payload, "message");
    }
}

function raiseEvent(payload: any, incomingPayload: CommandIncoming, type: string): Promise<any> {
    // TODO cd this url should change
    return axios.put("https://api.atomist.com/dashboard/v1/event", {
            team_id: incomingPayload.team.id,
            correlation_id: incomingPayload.corrid,
            message: payload,
            type,
        })
        .catch(err => {
            logger.warn(err);
        });
}
