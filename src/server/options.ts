import * as exp from "express";

/**
 * Customize the express server configuration: For example to add custom routes
 *
 * Example:
 *
 * const newRouteCustomizer = (express: exp.Express, ...handlers: exp.RequestHandler[]) => {
 *   express.get("/new-route", ...handlers, (req, res) => {
 *       res.json({ key: "value" });
 *   });
 * }
 */
export type ExpressCustomizer = (express: exp.Express, ...handlers: exp.RequestHandler[]) => void;

/**
 * Options common to configuring an Automation node and creating an AutomationServer
 */
export interface RunOptions {

    teamIds?: string | string[];
    name: string;
    version: string;
    policy?: "ephemeral" | "durable";
    token?: string;
    http?: {
        enabled: boolean;
        port?: number;
        host?: string;
        customizers?: ExpressCustomizer[],
        auth?: {
            basic?: {
                enabled: boolean;
                username?: string;
                password?: string;
            }
            bearer?: {
                enabled: boolean;
                org?: string;
                adminOrg?: string;
            },
        }
    };
    ws?: {
        enabled: boolean,
        gracePeriod?: number,
    };
    endpoints?: {
        graphql?: string,
        api?: string,
    };
}

export interface AutomationServerOptions extends RunOptions {

    keywords?: string[];
}
