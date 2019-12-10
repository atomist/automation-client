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
     */
    create(workspaceId: string,
           configuration: Configuration): GraphClient;

}

/**
 * Default GraphClientFactory to use
 */
export const defaultGraphClientFactory = () => new ApolloGraphClientFactory();
