import { Configuration } from "../../configuration";
import { ApolloGraphClientFactory } from "../../graph/ApolloGraphClientFactory";
import { GraphClient } from "./GraphClient";

/**
 * Factory to create GraphClient instances
 */
export interface GraphClientFactory {

    /**
     * Create a GraphClient for the provided workspaceId
     * @param workspaceId
     * @param configuration
     * @param authCallback
     */
    create(workspaceId: string,
           configuration: Configuration,
           authCallback: () => string): GraphClient;

}

/**
 * Default GraphClientFactory to use
 */
export const DefaultGraphClientFactory = new ApolloGraphClientFactory();
