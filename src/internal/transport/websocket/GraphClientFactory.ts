import * as stringify from "json-stringify-safe";
import * as NodeCache from "node-cache";
import { ApolloGraphClient } from "../../../graph/ApolloGraphClient";
import { GraphClient } from "../../../spi/graph/GraphClient";
import { logger } from "../../util/logger";
import {
    CommandIncoming,
    EventIncoming,
    isCommandIncoming,
    isEventIncoming,
} from "../RequestProcessor";
import { WebSocketClientOptions } from "./WebSocketClient";
import { RegistrationConfirmation } from "./WebSocketRequestProcessor";

/**
 * Factory for creating GraphClient instances for incoming commands and events.
 *
 * Uses a cache to store GraphClient instances for 5 mins after which new instances will be given out.
 */
export class GraphClientFactory {

    private graphClients = new NodeCache({ stdTTL: 1 * 60, checkperiod: 1 * 30, useClones: false });

    constructor(private registration: RegistrationConfirmation, private options: WebSocketClientOptions) { }

    public createGraphClient(event: CommandIncoming | EventIncoming): GraphClient {
        let teamId;
        if (isCommandIncoming(event)) {
            teamId = event.team.id;
        } else if (isEventIncoming(event)) {
            teamId = event.extensions.team_id;
        }

        let graphClient = this.graphClients.get(teamId);
        if (graphClient) {
            logger.debug("Re-using cached graph client for team '%s'", teamId);
            return graphClient;
        } else if (this.registration) {
            logger.debug("Creating new graph client for team '%s'", teamId);
            graphClient = new ApolloGraphClient(`${this.options.graphUrl}/${teamId}`,
                { Authorization: `Bearer ${this.registration.jwt}` });
            this.graphClients.set(teamId, graphClient);
            return graphClient;
        }
        logger.debug("Unable to create graph client for team '%s' and registration '$s'",
            teamId, stringify(this.registration));
        return null;
    }
}
