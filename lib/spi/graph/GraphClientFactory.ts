import { Configuration } from "../../configuration";
import { GraphClient } from "./GraphClient";

/**
 * Factory to create GraphClient instances
 */
export interface GraphClientFactory {

    /**
     * Create a GraphClient for the provided workspaceId
     * @param workspaceId
     * @param configuration
     */
    create(workspaceId: string,
           configuration: Configuration): GraphClient;

}

/**
 * Default GraphClientFactory to use
 */
export const defaultGraphClientFactory = () => new LazyApolloGraphClientFactory();

/**
 * Lazy wrapper around the ApolloGraphClientFactory to prevent eager loading
 */
class LazyApolloGraphClientFactory implements GraphClientFactory {

    private factory: GraphClientFactory;

    create(workspaceId: string, configuration: Configuration): GraphClient {
        if (!this.factory) {
            const agcf = require("../../graph/ApolloGraphClientFactory");
            this.factory = new agcf.ApolloGraphClientFactory();
        }
        return this.factory.create(workspaceId, configuration);
    }
}
