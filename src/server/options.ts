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
        host?: string;
        auth?: {
            basic?: {
                enabled: boolean;
                username?: string;
                password?: string;
            }
            bearer?: {
                enabled: boolean;
                token?: string;
            },
        }
    };
}

export interface AutomationServerOptions extends RunOptions {

    keywords: string[];
    graphqlEndpoint?: string;
}
