import * as NodeCache from "node-cache";
import { Configuration } from "../configuration";
import {
    CommandIncoming,
    EventIncoming,
    isCommandIncoming,
    isEventIncoming,
} from "../internal/transport/RequestProcessor";
import { logger } from "../util/logger";
import { GraphClient } from "../spi/graph/GraphClient";
import { ApolloGraphClient } from "./ApolloGraphClient";

/**
 * Factory for creating GraphClient instances for incoming commands and events.
 *
 * Uses a cache to store GraphClient instances for 5 mins after which new instances will be given out.
 */
export class ApolloGraphClientFactory {

    private graphClients = new NodeCache({ stdTTL: 1 * 60, checkperiod: 1 * 30, useClones: false });

    constructor(private configuration: Configuration,
                private authCallback: () => string) { }

    public createGraphClient(event: CommandIncoming | EventIncoming): GraphClient {
        let workspaceId;
        if (isCommandIncoming(event)) {
            workspaceId = event.team.id;
        } else if (isEventIncoming(event)) {
            workspaceId = event.extensions.team_id;
        }

        let graphClient = this.graphClients.get(workspaceId) as GraphClient;
        if (graphClient) {
            logger.debug("Re-using cached graph client for team '%s'", workspaceId);
            return graphClient;
        } else if (this.authCallback) {
            logger.debug("Creating new graph client for team '%s'", workspaceId);
            graphClient = new ApolloGraphClient(`${this.configuration.endpoints.graphql}/${workspaceId}`,
                { Authorization: this.authCallback() });
            this.graphClients.set(workspaceId, graphClient);
            return graphClient;
        }
        logger.debug("Unable to create graph client for team '%s'", workspaceId);
        return null;
    }
}
