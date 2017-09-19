/**
 * Options common to configuring an Automation node and creating
 * an AutomationServer
 */
export interface RunOptions {

    teamId: string;
    name: string;
    version: string;
    token?: string;
    http?: {
        enabled: boolean;
        port?: number;
        basicAuth?: {
            enabled: boolean;
            username?: string;
            password?: string;
        }
    };
}

export interface AutomationServerOptions extends RunOptions {

    keywords: string[];
    graphqlEndpoint?: string;
}
