/**
 * Options common to configuring an Automation node and creating
 * an AutomationServer
 */
export interface RunOptions {

    teamIds?: string | string[];
    groups?: string;
    name: string;
    version: string;
    token?: string;
    http?: {
        enabled: boolean;
        port?: number;
        host?: string;
        forceSecure?: boolean;
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
            github?: {
                enabled: boolean;
                clientId?: string;
                clientSecret: string;
                callbackUrl: string;
                org?: string;
                scopes?: string | string[];
            },
        }
    };
    endpoints?: {
        graphql?: string,
        api?: string,
    };
}

export interface AutomationServerOptions extends RunOptions {

    keywords: string[];
}
