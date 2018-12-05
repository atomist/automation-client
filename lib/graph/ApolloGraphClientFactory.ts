import axios from "axios";
import { buildAxiosFetch } from "axios-fetch";
import * as NodeCache from "node-cache";
import { Configuration } from "../configuration";
import { configureProxy } from "../internal/util/http";
import { GraphClient } from "../spi/graph/GraphClient";
import { GraphClientFactory } from "../spi/graph/GraphClientFactory";
import { logger } from "../util/logger";
import { ApolloGraphClient } from "./ApolloGraphClient";

/**
 * Factory for creating GraphClient instances for incoming commands and events.
 *
 * Uses a cache to store GraphClient instances for 5 mins after which new instances will be given out.
 */
export class ApolloGraphClientFactory implements GraphClientFactory {

    private graphClients: NodeCache;

    public create(workspaceId: string,
                  configuration: Configuration,
                  authCallback: () => string): GraphClient {
        this.init();
        let graphClient = this.graphClients.get(workspaceId) as GraphClient;
        if (graphClient) {
            logger.debug("Re-using cached graph client for team '%s'", workspaceId);
            return graphClient;
        } else {
            logger.debug("Creating new graph client for team '%s'", workspaceId);
            graphClient = new ApolloGraphClient(`${configuration.endpoints.graphql}/${workspaceId}`,
                { Authorization: authCallback() }, this.configure(configuration));
            this.graphClients.set(workspaceId, graphClient);
            return graphClient;
        }
        logger.debug("Unable to create graph client for team '%s'", workspaceId);
        return null;
    }

    protected configure(configuration: Configuration): GlobalFetch["fetch"] {
        return buildAxiosFetch(axios.create(configureProxy({})));
    }

    private init(): void {
        if (!this.graphClients) {
            this.graphClients = new NodeCache({
                stdTTL: 1 * 60,
                checkperiod: 1 * 30,
                useClones: false,
            });
        }
    }
}
