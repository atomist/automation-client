import * as bodyParser from "body-parser";
import * as express from "express";
import * as GitHubApi from "github";
import * as _ from "lodash";
import * as passport from "passport";
import * as http from "passport-http";
import * as bearer from "passport-http-bearer";
import { IStrategyOptions } from "passport-http-bearer";
import * as globals from "../../../globals";
import { CommandHandlerMetadata } from "../../../metadata/automationMetadata";
import { AutomationEventListener } from "../../../server/AutomationEventListener";
import { AutomationServer } from "../../../server/AutomationServer";
import { ExpressCustomizer } from "../../../server/options";
import {
    health,
    HealthStatus,
} from "../../util/health";
import { info } from "../../util/info";
import { logger } from "../../util/logger";
import {
    gc,
    heapDump,
} from "../../util/memory";
import { metrics } from "../../util/metric";
import { guid } from "../../util/string";
import { CommandIncoming } from "../RequestProcessor";
import { ExpressRequestProcessor } from "./ExpressRequestProcessor";

/**
 * Registers an endpoint for every automation and exposes
 * metadataFromInstance at root. Responsible for marshalling into the appropriate structure
 */
export class ExpressServer {

    constructor(private automations: AutomationServer,
                private listeners: AutomationEventListener[] = [],
                private options: ExpressServerOptions) {

        const exp = express();

        exp.use(bodyParser.json());
        exp.use(require("helmet")());

        exp.use(passport.initialize());

        // Enable cors for all endpoints
        const cors = require("cors");
        exp.options("*", cors());

        this.setupAuthentication();

        // Set up routes
        exp.get(`${ApiBase}/health`, cors(),
            (req, res) => {
                const h = health();
                res.status(h.status === HealthStatus.Up ? 200 : 500).json(h);
            });

        exp.get(`${ApiBase}/info`, cors(), this.adminRoute, this.authenticate,
            (req, res) => {
                res.json(info(automations.automations));
            });

        exp.get(`${ApiBase}/automations`, cors(), this.adminRoute, this.authenticate,
            (req, res) => {
                res.json(automations.automations);
            });

        exp.get(`${ApiBase}/metrics`, cors(), this.adminRoute, this.authenticate,
            (req, res) => {
                res.json(metrics());
            });

        exp.put(`${ApiBase}/memory/gc`, cors(), this.adminRoute, this.authenticate,
            (req, res) => {
                gc();
                res.sendStatus(201);
            });

        exp.put(`${ApiBase}/memory/heapdump`, cors(), this.adminRoute, this.authenticate,
            (req, res) => {
                heapDump();
                res.sendStatus(201);
            });

        exp.get(`${ApiBase}/log/events`, cors(), this.adminRoute, this.authenticate,
            (req, res) => {
                res.json(globals.eventStore().events(req.query.from));
            });

        exp.get(`${ApiBase}/log/commands`, cors(), this.adminRoute, this.authenticate,
            (req, res) => {
                res.json(globals.eventStore().commands(req.query.from));
            });

        exp.get(`${ApiBase}/log/messages`, cors(), this.adminRoute, this.authenticate,
            (req, res) => {
                res.json(globals.eventStore().messages(req.query.from));
            });

        exp.get(`${ApiBase}/series/events`, cors(), this.adminRoute, this.authenticate,
            (req, res) => {
                res.json(globals.eventStore().eventSeries());
            });

        exp.get(`${ApiBase}/series/commands`, cors(), this.adminRoute, this.authenticate,
            (req, res) => {
                res.json(globals.eventStore().commandSeries());
            });

        automations.automations.commands.forEach(
            h => {
                this.exposeCommandHandlerInvocationRoute(exp,
                    `${ApiBase}/command/${_.kebabCase(h.name)}`, h, cors,
                    (req, res, result) => {
                        if (result.redirect && !req.get("x-atomist-no-redirect")) {
                            res.redirect(result.redirect);
                        } else {
                            res.status(result.code === 0 ? 200 : 500).json(result);
                        }});
            },
        );

        if (!!this.options.customizers) {
            logger.info("Customizing Express server");
            this.options.customizers.forEach(c => c(exp, this.authenticate));
        }

        exp.listen(this.options.port, () => {
            logger.info(`Atomist automation dashboard running at 'http://${this.options.host}:${this.options.port}'`);
        });
    }

    private exposeCommandHandlerInvocationRoute(exp: express.Express,
                                                url: string,
                                                h: CommandHandlerMetadata,
                                                cors,
                                                handle: (req, res, result) => any) {

        exp.post(url, cors(), this.authenticate,
            (req, res) => {
                const id =  this.automations.automations.team_ids
                    ? this.automations.automations.team_ids[0] : "Txxxxxxxx";

                const payload: CommandIncoming = {
                    atomist_type: "command_handler_request",
                    name: h.name,
                    rug: {},
                    correlation_context: {team: { id }},
                    corrid: guid(),
                    team: {
                        id,
                    },
                    ...req.body,
                };

                const token = req.user ? req.user.token : undefined;
                const handler = new ExpressRequestProcessor(token, payload,
                    this.automations, this.listeners, this.options);

                handler.processCommand(payload, result => {
                    result.then(r => handle(req, res, r));
                });
            });

        exp.get(url, this.authenticate,
            (req, res) => {
                const parameters = h.parameters.filter(p => {
                    const value = req.query[p.name];
                    return value && value.length > 0;
                }).map(p => {
                    return {name: p.name, value: req.query[p.name]};
                });
                const mappedParameters = (h.mapped_parameters || []).filter(p => {
                    const value = req.query[`mp_${p.local_key}`];
                    return value && value.length > 0;
                }).map(p => {
                    return {name: p.local_key, value: req.query[`mp_${p.local_key}`]};
                });
                const secrets = h.secrets.map(p => {
                    const value = req.query[`s_${p.path}`];
                    return {name: p.path, value };
                });

                const id =  this.automations.automations.team_ids
                    ? this.automations.automations.team_ids[0] : "Txxxxxxxx";

                const payload: CommandIncoming = {
                    atomist_type: "command_handler_request",
                    name: h.name,
                    parameters,
                    rug: {},
                    mapped_parameters: mappedParameters,
                    secrets,
                    correlation_context: { team: { id } },
                    corrid: guid(),
                    team: {
                        id,
                    },
                };

                const token = req.user ? req.user.token : undefined;
                const handler = new ExpressRequestProcessor(token, payload,
                    this.automations, this.listeners, this.options);

                handler.processCommand(payload, result => {
                    result.then(r => handle(req, res, r));
                });
            });
    }

    private setupAuthentication() {

        if (this.options.auth && this.options.auth.basic && this.options.auth.basic.enabled) {
            const user: string = this.options.auth.basic.username ? this.options.auth.basic.username : "admin";
            const pwd: string = this.options.auth.basic.password ? this.options.auth.basic.password : guid();

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
            const org = this.options.auth.bearer.org;
            const adminOrg = this.options.auth.bearer.adminOrg;

            passport.use(new bearer.Strategy({
                        passReqToCallback: true,
                    } as IStrategyOptions,
                    (req, token, done) => {
                        const api = new GitHubApi();
                        api.authenticate({ type: "token", token });
                        api.users.get({} )
                            .then(user => {
                                if (adminOrg && req.__admin === true) {
                                    return api.orgs.checkMembership({
                                        username: user.data.login,
                                        org: adminOrg,
                                    })
                                    .then(() => {
                                        return user.data;
                                    });
                                } else if (org) {
                                    return api.orgs.checkMembership({
                                        username: user.data.login,
                                        org,
                                    })
                                    .then(() => {
                                        return user.data;
                                    });
                                } else {
                                    return user.data;
                                }
                            })
                            .then(user => {
                                done(null, { token, user });
                            })
                            .catch(err => {
                                console.log(err);
                                done(null, false);
                            });
                },
            ));
        }
    }

    private adminRoute = (req, res, next) => {
        req.__admin = true;
        next();
    }

    private authenticate = (req, res, next) => {
        if (this.options.auth) {
            const strategies = [];
            if (this.options.auth.bearer && this.options.auth.bearer.enabled === true) {
                strategies.push("bearer");
            }
            if (this.options.auth.basic && this.options.auth.basic.enabled === true) {
                strategies.push("basic");
            }
            if (strategies.length > 0) {
                passport.authenticate(strategies, { session: false })(req, res, next);
            } else {
                next();
            }
        } else {
            next();
        }
    }
}

const ApiBase = "";

export interface ExpressServerOptions {

    port: number;
    host?: string;
    customizers?: ExpressCustomizer[];
    auth?: {
        basic: {
            enabled: boolean;
            username?: string;
            password?: string;
        },
        bearer: {
            enabled: boolean;
            org?: string;
            adminOrg?: string;
        },
    };
    endpoint: {
        graphql: string;
    };
}
