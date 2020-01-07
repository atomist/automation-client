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
                  configuration: Configuration): GraphClient {
        this.init();
        let graphClient = this.graphClients.get<GraphClient>(workspaceId);
        if (graphClient) {
            return graphClient;
        } else {
            const headers = {
                "Authorization": `Bearer ${configuration.apiKey}`,
                "apollographql-client-name": `${configuration.name}/${workspaceId}`,
                "apollographql-client-version": configuration.version,
            };
            graphClient = new ApolloGraphClient(
                `${configuration.endpoints?.graphql}/${workspaceId}`,
                headers,
                this.configure(configuration),
                configuration.graphql?.listeners || []);
            this.graphClients.set<GraphClient>(workspaceId, graphClient);
            return graphClient;
        }
        logger.debug("Unable to create graph client for team '%s'", workspaceId);
        return null;
    }

    protected configure(configuration: Configuration): WindowOrWorkerGlobalScope["fetch"] {
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
