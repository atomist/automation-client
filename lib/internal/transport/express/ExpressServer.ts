import * as GitHubApi from "@octokit/rest";
import * as bodyParser from "body-parser";
import * as express from "express";
import * as passport from "passport";
import * as http from "passport-http";
import * as bearer from "passport-http-bearer";
import * as tokenHeader from "passport-http-header-token";
import {
    Configuration,
    ExpressCustomizer,
} from "../../../configuration";
import * as globals from "../../../globals";
import { AutomationContextAware } from "../../../HandlerContext";
import { noEventHandlersWereFound } from "../../../server/AbstractAutomationServer";
import { AutomationServer } from "../../../server/AutomationServer";
import { GraphClient } from "../../../spi/graph/GraphClient";
import { MessageClient } from "../../../spi/message/MessageClient";
import { logger } from "../../../util/logger";
import { scanFreePort } from "../../../util/port";
import {
    health,
    HealthStatus,
} from "../../util/health";
import { info } from "../../util/info";
import {
    gc,
    heapDump,
} from "../../util/memory";
import { metrics } from "../../util/metric";
import { guid } from "../../util/string";
import { RequestProcessor } from "../RequestProcessor";
import { prepareRegistration } from "../websocket/payloads";

/**
 * Registers an endpoint for every automation and exposes
 * metadataFromInstance at root. Responsible for marshalling into the appropriate structure
 */
export class ExpressServer {

    private readonly exp: express.Express;

    constructor(private readonly automations: AutomationServer,
                private readonly configuration: Configuration,
                private readonly handler: RequestProcessor) {

        this.exp = express();

        this.exp.use(bodyParser.json());
        this.exp.use(require("helmet")());

        this.exp.use(passport.initialize());

        // Enable cors for all endpoints
        const cors = require("cors");
        this.setupAuthentication();

        // Set up routes
        this.exp.options(`${ApiBase}/health`, cors());
        this.exp.get(`${ApiBase}/health`, cors(),
            (req, res) => {
                const h = health();
                res.status(h.status === HealthStatus.Up ? 200 : 500).json(h);
            });

        this.exp.options(`${ApiBase}/info`, cors());
        this.exp.get(`${ApiBase}/info`, cors(), this.adminRoute, this.authenticate,
            (req, res) => {
                res.json(info(automations.automations));
            });

        this.exp.options(`${ApiBase}/registration`, cors());
        this.exp.get(`${ApiBase}/registration`, cors(), this.adminRoute, this.authenticate,
            (req, res) => {
                res.json(prepareRegistration(automations.automations));
            });

        this.exp.options(`${ApiBase}/metrics`, cors());
        this.exp.get(`${ApiBase}/metrics`, cors(), this.adminRoute, this.authenticate,
            (req, res) => {
                res.json(metrics());
            });

        this.exp.options(`${ApiBase}/memory/gc`, cors());
        this.exp.put(`${ApiBase}/memory/gc`, cors(), this.adminRoute, this.authenticate,
            (req, res) => {
                gc();
                res.sendStatus(201);
            });

        this.exp.options(`${ApiBase}/memory/heapdump`, cors());
        this.exp.put(`${ApiBase}/memory/heapdump`, cors(), this.adminRoute, this.authenticate,
            (req, res) => {
                heapDump();
                res.sendStatus(201);
            });

        this.exp.options(`${ApiBase}/log/events`, cors());
        this.exp.get(`${ApiBase}/log/events`, cors(), this.adminRoute, this.authenticate,
            (req, res) => {
                res.json(globals.eventStore().events(req.query.from));
            });

        this.exp.options(`${ApiBase}/log/commands`, cors());
        this.exp.get(`${ApiBase}/log/commands`, cors(), this.adminRoute, this.authenticate,
            (req, res) => {
                res.json(globals.eventStore().commands(req.query.from));
            });

        this.exp.options(`${ApiBase}/log/messages`, cors());
        this.exp.get(`${ApiBase}/log/messages`, cors(), this.adminRoute, this.authenticate,
            (req, res) => {
                res.json(globals.eventStore().messages(req.query.from));
            });

        this.exp.options(`${ApiBase}/series/events`, cors());
        this.exp.get(`${ApiBase}/series/events`, cors(), this.adminRoute, this.authenticate,
            (req, res) => {
                res.json(globals.eventStore().eventSeries());
            });

        this.exp.options(`${ApiBase}/series/commands`, cors());
        this.exp.get(`${ApiBase}/series/commands`, cors(), this.adminRoute, this.authenticate,
            (req, res) => {
                res.json(globals.eventStore().commandSeries());
            });

        this.exposeCommandHandlerInvocationRoute(this.exp,
            `${ApiBase}/command`, cors,
            (req, res, result) => {
                if (result.redirect && !req.get("x-atomist-no-redirect")) {
                    res.redirect(result.redirect);
                } else {
                    res.status(result.code === 0 ? 200 : 500).json(result);
                }
            });

        this.exposeEventHandlerInvocationRoute(this.exp,
            `${ApiBase}/event`, cors,
            (req, res, result) => {
                const results = Array.isArray(result) ? result : [result];
                const code = noEventHandlersWereFound(result) ? 404 :
                    results.some(r => r.code !== 0) ? 500 : 200;
                res.status(code).json(result);
            });

        if (this.configuration.http.customizers.length > 0) {
            logger.debug("Invoking http server customizers");
            this.configuration.http.customizers.forEach(c => c(this.exp, this.authenticate));
        }
    }

    public run(): Promise<boolean> {
        let portPromise;
        if (!this.configuration.http.port) {
            portPromise = scanFreePort();
        } else {
            portPromise = Promise.resolve(this.configuration.http.port);
        }

        return portPromise
            .then(port => {
                this.configuration.http.port = port;
                const hostname = this.configuration.http.host || "0.0.0.0";
                this.exp.listen(port, hostname, () => {
                    logger.debug(
                        `Atomist automation client api running at 'http://${hostname}:${port}'`);
                    return true;
                }).on("error", err => {
                    logger.error(`Failed to start automation client api: ${err.message}`);
                    return false;
                });
            });
    }

    private exposeCommandHandlerInvocationRoute(exp: express.Express,
                                                url: string,
                                                cors,
                                                handle: (req, res, result) => any) {

        exp.post(url, cors(), this.authenticate,
            (req, res) => {
                this.handler.processCommand(req.body, result => {
                    result.then(r => handle(req, res, r));
                });
            });
    }

    private exposeEventHandlerInvocationRoute(exp: express.Express,
                                              url: string,
                                              cors,
                                              handle: (req, res, result) => any) {

        exp.post(url, cors(), this.authenticate,
            (req, res) => {
                this.handler.processEvent(req.body, result => {
                    result.then(r => handle(req, res, r));
                });
            });
    }

    private setupAuthentication() {

        if (this.configuration.http.auth && this.configuration.http.auth.basic && this.configuration.http.auth.basic.enabled) {
            const user: string = this.configuration.http.auth.basic.username ? this.configuration.http.auth.basic.username : "admin";
            const pwd: string = this.configuration.http.auth.basic.password ? this.configuration.http.auth.basic.password : guid();

            passport.use("basic", new http.BasicStrategy(
                (username, password, done) => {
                    if (user === username && pwd === password) {
                        done(null, { user: username });
                    } else {
                        done(null, false);
                    }
                },
            ));

            if (!this.configuration.http.auth.basic.password) {
                logger.debug(`Auto-generated credentials for web endpoints are user '${user}' and password '${pwd}'`);
            }
        }

        if (this.configuration.http.auth && this.configuration.http.auth.bearer && this.configuration.http.auth.bearer.enabled) {
            const org = this.configuration.http.auth.bearer.org;
            const adminOrg = this.configuration.http.auth.bearer.adminOrg;

            passport.use("bearer", new bearer.Strategy({
                    passReqToCallback: true,
                } as bearer.IStrategyOptions,
                (req, token, done) => {
                    const api = new GitHubApi();
                    api.authenticate({ type: "token", token });
                    api.users.getAuthenticated({})
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
                            return done(null, { token, user });
                        })
                        .catch(err => {
                            console.log(err);
                            return done(null, false);
                        });
                },
            ));
        }

        if (this.configuration.http.auth && this.configuration.http.auth.token && this.configuration.http.auth.token.enabled) {
            const cb = this.configuration.http.auth.token.verify || (token => Promise.resolve(false));

            passport.use("token", new tokenHeader.Strategy(
                (token, done) => {
                    cb(token)
                        .then(valid => {
                            if (valid) {
                                return done(null, { user: token });
                            } else {
                                return done(null, false);
                            }
                        })
                        .catch(err => {
                            console.log(err);
                            return done(null, false);
                        });
                },
            ));
        }
    }

    private readonly adminRoute = (req, res, next) => {
        req.__admin = true;
        next();
    }

    private readonly authenticate = (req, res, next) => {
        if (this.configuration.http.auth) {
            const strategies = [];
            if (this.configuration.http.auth.bearer && this.configuration.http.auth.bearer.enabled === true) {
                strategies.push("bearer");
            }
            if (this.configuration.http.auth.basic && this.configuration.http.auth.basic.enabled === true) {
                strategies.push("basic");
            }
            if (this.configuration.http.auth.token && this.configuration.http.auth.token.enabled === true) {
                strategies.push("token");
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
        basic?: {
            enabled?: boolean;
            username?: string;
            password?: string;
        },
        bearer?: {
            enabled?: boolean;
            org?: string;
            adminOrg?: string;
        },
        token?: {
            enabled?: boolean;
            verify?: (token: string) => Promise<boolean>;
        },
    };
    endpoint: {
        graphql: string;
    };
    messageClientFactory?: (aca: AutomationContextAware) => MessageClient;
    graphClientFactory?: (aca: AutomationContextAware) => GraphClient;
}
