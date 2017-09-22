import * as bodyParser from "body-parser";
import * as express from "express";
import * as passport from "passport";

import { AutomationServer } from "../../../server/AutomationServer";
import { CommandHandlerMetadata, IngestorMetadata } from "../../metadata/metadata";

import * as appRoot from "app-root-path";
import * as mustacheExpress from "mustache-express";

import { Express, Handler } from "express";
import * as fs from "fs";
import * as os from "os";
import { DefaultStagingAtomistGraphQLServer } from "../../../automationClient";
import { getJwtToken } from "../../../globals";
import { eventStore } from "../../event/InMemoryEventStore";
import { logger } from "../../util/logger";
import { report } from "../../util/metric";
import { guid } from "../../util/string";
import { AutomationEventListener, CommandIncoming, EventIncoming } from "../AutomationEventListener";

import * as _ from "lodash";
import * as http from "passport-http";
import * as bearer from "passport-http-bearer";

const ApiBase = "";

/**
 * Registers an endpoint for every automation and exposes
 * metadataFromInstance at root. Responsible for marshalling into the appropriate structure
 */
export class ExpressServer {

    constructor(private automations: AutomationServer,
                private options: ExpressServerOptions,
                private listeners: AutomationEventListener[] = []) {

        const exp = express();

        exp.engine("html", mustacheExpress());
        exp.set("view engine", "mustache");

        exp.use(bodyParser.json());
        exp.use(passport.initialize());

        // TODO that's probably not the way it should work; but it does work when using this inside a node_module
        if (fs.existsSync(appRoot + "/views")) {
            exp.set("views", appRoot + "/views");
        } else {
            exp.set("views", appRoot + "/node_modules/@atomist/automation-client/views");
        }

        if (fs.existsSync(appRoot + "/public")) {
            exp.use(express.static(appRoot + "/public"));
        } else {
            exp.use(express.static(appRoot + "/node_modules/@atomist/automation-client/public"));
        }

        this.setupAuthentication();

        // Set up routes
        exp.get(`${ApiBase}/automations`, this.authenticate("basic", "bearer"),
            (req, res) => {
                res.setHeader("Content-Type", "application/json");
                res.setHeader("Access-Control-Allow-Origin", "*");
                res.json(automations.rugs);
        });

        exp.get(`${ApiBase}/metrics`, this.authenticate("basic", "bearer"),
            (req, res) => {
                res.setHeader("Content-Type", "application/json");
                res.setHeader("Access-Control-Allow-Origin", "*");
                res.json(report.summary());
        });

        exp.get(`${ApiBase}/events`, this.authenticate("basic", "bearer"),
            (req, res) => {
                res.setHeader("Content-Type", "application/json");
                res.setHeader("Access-Control-Allow-Origin", "*");
                res.json(eventStore.events(req.query.from));
        });

        exp.get(`${ApiBase}/commands`, this.authenticate("basic", "bearer"),
            (req, res) => {
                res.setHeader("Content-Type", "application/json");
                res.setHeader("Access-Control-Allow-Origin", "*");
                res.json(eventStore.commands(req.query.from));
        });

        exp.get(`${ApiBase}/messages`, this.authenticate("basic", "bearer"),
            (req, res) => {
                res.setHeader("Content-Type", "application/json");
                res.setHeader("Access-Control-Allow-Origin", "*");
                res.json(eventStore.messages(req.query.from));
        });

        exp.get("/graphql", this.authenticate("basic"),
            (req, res) => {
                res.render("graphql.html", { token: getJwtToken(), graphQLUrl: DefaultStagingAtomistGraphQLServer });
        });

        exp.get("/", this.authenticate("basic"),
            (req, res) => {
                res.render("index.html");
        });

        automations.rugs.commands.forEach(
            h => {
                this.exposeCommandHandlerInvocationRoute(exp,
                    `${ApiBase}/command/${_.kebabCase(h.name)}`, h,
                    (res, result) => res.send(result));
            },
        );
        automations.rugs.ingestors.forEach(
            i => {
                this.exposeEventInvocationRoute(exp,
                    `${ApiBase}/ingest/${i.route.toLowerCase()}`, i,
                    (res, result) => res.send(result));
        });

        exp.listen(this.options.port, () => {
            logger.info(`Atomist automation dashboard running at 'http://${this.options.host}:${this.options.port}'`);
        });
    }

    private exposeCommandHandlerInvocationRoute(exp: Express,
                                                url: string,
                                                h: CommandHandlerMetadata,
                                                handle: (res, result) => any) {

        exp.get(url, this.authenticate("basic", "bearer"),
            (req, res) => {
                const args = h.parameters.filter(p => {
                    const value = req.query[p.name];
                    return value && value.length > 0;
                }).map(p => {
                    return {name: p.name, value: req.query[p.name]};
            });
                const payload: CommandIncoming = {
                atomist_type: "command_handler_request",
                name: h.name,
                parameters: args,
                rug: {},
                mapped_parameters: undefined,
                secrets: undefined,
                correlation_context: {team: { id: this.automations.rugs.team_id }},
                corrid: guid(),
                team: {
                    id: this.automations.rugs.team_id,
                },
            };
                logger.debug("Incoming payload for command handler '%s'\n%s", h.name, JSON.stringify(payload, null, 2));

                Promise.all(this.listeners.map(l => l.onCommand(payload)))
                .then(result => {
                    return handle(res, result);
                })
                .catch(err => res.send(err));
        });
    }

    private exposeEventInvocationRoute(exp: Express,
                                       url: string,
                                       h: IngestorMetadata,
                                       handle: (res, result) => any) {
        exp.post(url, (req, res) => {

            const payload: EventIncoming = {
                data: req.body,
                extensions: {
                    operationName: h.route,
                    correlation_id: guid(),
                    team_id: this.automations.rugs.team_id,
                },
                secrets: [],
            };
            logger.debug("Incoming payload for ingestor '%s'\n%s", h.name, JSON.stringify(payload, null, 2));

            Promise.all(this.listeners.map(l => l.onEvent(payload)))
                .then(result => {
                    return handle(res, result);
                })
                .catch(err => res.send(err));
        });
    }

    private setupAuthentication() {

        if (this.options.auth && this.options.auth.basic && this.options.auth.basic.enabled) {
            const user = this.options.auth.basic.username ? this.options.auth.basic.username : "admin";
            const pwd = this.options.auth.basic.password ? this.options.auth.basic.password : guid();

            passport.use(new http.BasicStrategy(
                (username, password, done) => {
                    if (user === username && pwd === password) {
                        done(null, { user: username });
                    } else {
                        done(null, false);
                    }
                },
            ));

            if (!this.options.auth.basic.password) {
                logger.info(`Auto-generated credentials for web endpoints are user '${user}' and password '${pwd}'`);
            }
        }

        if (this.options.auth && this.options.auth.bearer && this.options.auth.bearer.enabled) {
            const tk = this.options.auth.bearer.token;

            passport.use(new bearer.Strategy(
                (token, done) => {
                    if (token === tk) {
                        done(null, {token } );
                    } else {
                        done(null, false);
                    }
                },
            ));
        }
    }

    private authenticate(...strategies: string[]): Handler {

        const actualStrategies = [];
        if (this.options.auth) {
            if (this.options.auth.basic.enabled && strategies.indexOf("basic") >= 0) {
                actualStrategies.push("basic");
            }
            if (this.options.auth.bearer.enabled && strategies.indexOf("bearer") >= 0) {
                actualStrategies.push("bearer");
            }
        }
        if (actualStrategies.length > 0) {
            return passport.authenticate(actualStrategies, { session: false });
        } else {
            return (req, res, next) => { next(); };
        }
    }
}

export interface ExpressServerOptions {

    port: number;
    host?: string;
    auth?: {
        basic: {
            enabled: boolean;
            username?: string;
            password?: string;
        },
        bearer: {
            enabled: boolean;
            token: string;
        },
    };
}
