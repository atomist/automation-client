import * as appRoot from "app-root-path";
import * as bodyParser from "body-parser";
import * as express from "express";
import * as fs from "fs";
import * as GitHubApi from "github";
import * as _ from "lodash";
import * as mustacheExpress from "mustache-express";
import * as passport from "passport";
import * as github from "passport-github";
import * as http from "passport-http";
import * as bearer from "passport-http-bearer";
import * as globals from "../../../globals";
import { MappedParameters } from "../../../Handlers";
import {
    CommandHandlerMetadata,
    IngestorMetadata,
} from "../../../metadata/automationMetadata";
import { AutomationServer } from "../../../server/AutomationServer";
import { health, HealthStatus } from "../../util/health";
import { info } from "../../util/info";
import { logger } from "../../util/logger";
import { metrics } from "../../util/metric";
import { guid } from "../../util/string";
/**
 * Registers an endpoint for every automation and exposes
 * metadataFromInstance at root. Responsible for marshalling into the appropriate structure
 */
export class ExpressServer {

    private basicAuth = false;
    private bearerAuth = false;
    private gitHubAuth = false;
    private adminOrg;

    constructor(private automations: AutomationServer,
                private options: ExpressServerOptions,
                private handler: RequestProcessor) {

        const exp = express();
        exp.set("view engine", "mustache");
        exp.engine("html", mustacheExpress());

        exp.use(bodyParser.json());
        exp.use(require("helmet")());
        exp.use(require("connect-flash")());

        const session = require("express-session");
        const MemoryStore = require("memorystore")(session);

        exp.use(session({
            store: new MemoryStore({
                checkPeriod: 86400000, // prune expired entries every 24h
            }),
            secret: "Careful Man, there's beverage here!",
            cookie: { maxAge: 172800000 }, // two days
            resave: true,
            saveUninitialized: true,
        }));
        exp.use(passport.initialize());
        exp.use(passport.session());

        // Serve the views and static content out of this module or from node_modules
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

        if (this.options.auth && this.options.auth.github.enabled) {
            exp.get("/auth/github", passport.authenticate("github",
                { successReturnToOrRedirect: "/", failureRedirect: "/error", failureFlash: true }));
            exp.get("/auth/github/callback", passport.authenticate("github",
                { successReturnToOrRedirect: "/", failureRedirect: "/error", failureFlash: true }),
                (req, res) => {
                    // Successful authentication, redirect home.
                    res.redirect("/");
                });

            exp.get("/error", (req, res) => {
                req.flash("error", "Authentication failed");
                res.redirect("/login");
            });
        }

        if (this.options.forceSecure === true) {
            exp.set("forceSSLOptions", {
                enable301Redirects: true,
                trustXFPHeader: true,
                httpsPort: 443,
            });
        }

        // Set up routes
        exp.get(`${ApiBase}/health`,
            (req, res) => {
                res.setHeader("Access-Control-Allow-Origin", "*");
                const h = health();
                res.status(h.status === HealthStatus.Up ? 200 : 500).json(h);
            });

        exp.get(`${ApiBase}/info`, this.enforceSecure, this.authenticate, this.verifyAdminGroup,
            (req, res) => {
                res.setHeader("Access-Control-Allow-Origin", "*");
                res.json(info(automations.automations));
            });

        exp.get(`${ApiBase}/automations`, this.enforceSecure, this.authenticate, this.verifyAdminGroup,
            (req, res) => {
                res.setHeader("Access-Control-Allow-Origin", "*");
                res.json(automations.automations);
            });

        exp.get(`${ApiBase}/metrics`, this.enforceSecure, this.authenticate, this.verifyAdminGroup,
            (req, res) => {
                res.setHeader("Access-Control-Allow-Origin", "*");
                res.json(metrics());
            });

        exp.get(`${ApiBase}/log/events`, this.enforceSecure, this.authenticate, this.verifyAdminGroup,
            (req, res) => {
                res.setHeader("Access-Control-Allow-Origin", "*");
                res.json(globals.eventStore().events(req.query.from));
            });

        exp.get(`${ApiBase}/log/commands`, this.enforceSecure, this.authenticate, this.verifyAdminGroup,
            (req, res) => {
                res.setHeader("Access-Control-Allow-Origin", "*");
                res.json(globals.eventStore().commands(req.query.from));
            });

        exp.get(`${ApiBase}/log/messages`, this.enforceSecure, this.authenticate, this.verifyAdminGroup,
            (req, res) => {
                res.setHeader("Access-Control-Allow-Origin", "*");
                res.json(globals.eventStore().messages(req.query.from));
            });

        exp.get(`${ApiBase}/series/events`, this.enforceSecure, this.authenticate, this.verifyAdminGroup,
            (req, res) => {
                res.setHeader("Access-Control-Allow-Origin", "*");
                res.json(globals.eventStore().eventSeries());
            });

        exp.get(`${ApiBase}/series/commands`, this.enforceSecure, this.authenticate, this.verifyAdminGroup,
            (req, res) => {
                res.setHeader("Access-Control-Allow-Origin", "*");
                res.json(globals.eventStore().commandSeries());
            });

        exp.get("/graphql", this.enforceSecure, this.authenticate, this.verifyAdminGroup,
            (req, res) => {
                const teamId = req.query.teamId ? req.query.teamId : this.automations.automations.team_ids[0];
                res.render("graphql.html", { token: globals.jwtToken(),
                    graphQLUrl: `${this.options.endpoint.graphql}/${teamId}`,
                    teamIds: this.automations.automations.team_ids,
                    user: req.user });
            });

        exp.get("/", this.enforceSecure, this.authenticate, this.verifyAdminGroup,
            (req, res) => {
                res.render("index.html", { user: req.user });
            });

        exp.get("/login",
            (req, res) => {
                res.render("login.html", { user: req.user, message: req.flash("error") });
            });

        automations.automations.commands.forEach(
            h => {
                this.exposeCommandHandlerInvocationRoute(exp,
                    `${ApiBase}/command/${_.kebabCase(h.name)}`, h,
                    (res, result) => res.status(result.code === 0 ? 200 : 500).json(result));
                this.exposeCommandHandlerHtmlInvocationRoute(exp, `${ApiBase}/command/html/${_.kebabCase(h.name)}`, h);
            },
        );
        automations.automations.ingestors.forEach(
            i => {
                this.exposeEventInvocationRoute(exp,
                    `${ApiBase}/ingest/${i.route.toLowerCase()}`, i,
                    (res, result) => res.status(result.some(r => r.code !== 0) ? 500 : 200).json(result));
            });

        if (!!this.options.customizers) {
            logger.info("Customizing Express server");
            this.options.customizers.forEach(c => c(exp, this.enforceSecure, this.authenticate));
        }

        exp.listen(this.options.port, () => {
            logger.info(`Atomist automation dashboard running at 'http://${this.options.host}:${this.options.port}'`);
        });
    }

    private exposeCommandHandlerHtmlInvocationRoute(exp: express.Express,
                                                    url: string,
                                                    h: CommandHandlerMetadata) {
        exp.get(url, this.enforceSecure, this.authenticate,
            (req, res) => {
                const mappedParameters = h.mapped_parameters.map(mp => {
                    if (mp.foreign_key === MappedParameters.GitHubOwner && req.user) {
                        return { name: mp.local_key, value: req.user.orgs,
                            description: "organization or user on GitHub the command should run against."
                            + " In case of a generator this is where the new repository will be created.",
                            display_name: "Target Organization"};
                        // } else if (mp.foreign_key === MappedParameters.GitHubRepository) {
                        //    return { name: mp.local_key, value: req.user.repos };
                    } else {
                        return null;
                    }
                }).filter(mp => mp !== null);

                res.render("command.html", {...h, route: _.kebabCase(h.name),
                    mapped_parameters: mappedParameters });
            });
    }

    private exposeCommandHandlerInvocationRoute(exp: express.Express,
                                                url: string,
                                                h: CommandHandlerMetadata,
                                                handle: (res, result) => any) {

        exp.post(url, this.enforceSecure, this.authenticate,
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

                this.handler.processCommand(payload, result => {
                    handle(res, result);
                });
            });

        exp.get(url, this.enforceSecure, this.authenticate,
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
                const secrets = h.secrets.filter(p => {
                    const value = req.query[`s_${p.path}`];
                    if (value && value.length > 0) {
                        return true;
                    } else if (p.path.startsWith("github://") && req.user && req.user.accessToken) {
                        return true;
                    }
                    return false;
                }).map(p => {
                    const value = req.query[`s_${p.path}`];
                    if (value) {
                        return {name: p.path, value };
                    } else {
                        return {name: p.path, value: req.user.accessToken };
                    }
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
                this.handler.processCommand(payload, result => {
                    handle(res, result);
                });
            });
    }

    private exposeEventInvocationRoute(exp: express.Express,
                                       url: string,
                                       h: IngestorMetadata,
                                       handle: (res, result) => any) {
        exp.post(url, (req, res) => {
            const payload: EventIncoming = {
                data: req.body,
                extensions: {
                    operationName: h.route,
                    correlation_id: guid(),
                    team_id: this.automations.automations.team_ids[0],
                },
                secrets: [],
            };
            this.handler.processEvent(payload, result => {
                handle(res, result);
            });
        });
    }

    private setupAuthentication() {

        passport.serializeUser((user, cb) => {
            cb(null, user);
        });

        passport.deserializeUser((obj, cb) => {
            cb(null, obj);
        });

        if (this.options.auth && this.options.auth.github.enabled) {
            const scopes = this.options.auth.github.scopes
                ? this.options.auth.github.scopes : ["user", "repo", "read:org"];

            const org = this.options.auth.github.org;
            const adminOrg = this.options.auth.github.adminOrg;
            passport.use(new github.Strategy({
                    clientID: this.options.auth.github.clientId,
                    clientSecret: this.options.auth.github.clientSecret,
                    callbackURL: `${this.options.auth.github.callbackUrl}/auth/github/callback`,
                    userAgent: `${this.automations.automations.name}/${this.automations.automations.version}`,
                    scope: scopes,
                }, (accessToken, refreshToken, profile, cb) => {
                    logger.info(`Successfully authenticated GitHub user: %j`, profile);
                    // check org membership
                    api.authenticate({ type: "token", token: accessToken });
                    if (org) {
                        api.orgs.checkMembership({ org, username: profile.username })
                            .then(() => {
                                return api.users.getOrgs({ per_page: 100, page: 0})
                                    .then(function paging(result, orgs = []) {
                                        result.data.forEach(r => orgs.push(r.login));
                                        if (!api.hasNextPage(result.meta.link)) {
                                            return orgs;
                                        }

                                        return api.getNextPage(result.meta.link)
                                            .then(r => paging(r, orgs));
                                    });
                            })
                            .then(orgs => {
                                orgs.push(profile.username);
                                orgs = orgs.sort((o1, o2) => o1.localeCompare(o2));
                                cb(null, { ...profile, accessToken, orgs });
                            })
                            .catch(err => cb(null, false));
                    } else if (adminOrg) {
                        return api.users.getOrgs({ per_page: 100, page: 0})
                            .then(function paging(result, orgs = []) {
                                result.data.forEach(r => orgs.push(r.login));
                                if (!api.hasNextPage(result.meta.link)) {
                                    return orgs;
                                }

                                return api.getNextPage(result.meta.link)
                                    .then(r => paging(r, orgs));
                            })
                            .then(orgs => {
                                orgs.push(profile.username);
                                orgs = orgs.sort((o1, o2) => o1.localeCompare(o2));
                                cb(null, { ...profile, accessToken, orgs });
                            })
                            .catch(err => cb(null, false));
                    } else {
                        return cb(null, { ...profile, accessToken });
                    }
                },
            ));

            this.gitHubAuth = true;
            this.adminOrg = this.options.auth.github.adminOrg;
        }

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

            this.basicAuth = true;
        }

        if (this.options.auth && this.options.auth.bearer && this.options.auth.bearer.enabled) {
            const tk = this.options.auth.bearer.token;

            passport.use(new bearer.Strategy(
                (token, done) => {
                    if (token === tk) {
                        done(null, { token } );
                    } else {
                        done(null, false);
                    }
                },
            ));

            this.bearerAuth = true;
        }
    }

    private authenticate = (req, res, next) => {
        // Check for Auth headers first
        if (req.headers.authorization || req.headers.Authorization) {
            if (this.bearerAuth && this.basicAuth) {
                passport.authenticate(["basic", "bearer"])(req, res, next);
            } else if (this.bearerAuth) {
                passport.authenticate(["bearer"])(req, res, next);
            } else if (this.basicAuth) {
                passport.authenticate(["basic"])(req, res, next);
            }
        } else if (this.basicAuth && !this.gitHubAuth) {
            passport.authenticate(["basic"])(req, res, next);
        } else if (!this.basicAuth && !this.bearerAuth && !this.gitHubAuth) {
            next();
        } else {
            require("connect-ensure-login").ensureLoggedIn()(req, res, next);
        }
    }

    private verifyAdminGroup = (req, res, next) => {
        // If this client is using GitHub auth and has an adminOrg configured;
        // make sure the auth'ed user has access to that org
        if (this.gitHubAuth && this.adminOrg) {
            if (!req.user || !req.user.orgs) {
                return res.redirect("/login");
            }
            if (req.user.orgs.some(o => o === this.adminOrg)) {
                next();
            } else {
                req.flash("error", "Access denied");
                return res.redirect("/login");
            }
        } else {
            next();
        }
    }

    private enforceSecure = (req, res, next) => {
        if (this.options.forceSecure === true) {
            const forceSsl = require("express-force-ssl");
            return forceSsl(req, res, next);
        } else {
            return next();
        }
    }
}

import { ExpressCustomizer } from "../../../server/options";
import {
    CommandIncoming,
    EventIncoming,
    RequestProcessor,
} from "../RequestProcessor";
const ApiBase = "";

const api = new GitHubApi();

export interface ExpressServerOptions {

    port: number;
    host?: string;
    forceSecure?: boolean;
    customizers?: ExpressCustomizer[];
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
        github: {
            enabled: boolean;
            clientId: string,
            clientSecret: string,
            callbackUrl: string,
            org?: string,
            adminOrg?: string,
            scopes?: string[];
        },
    };
    endpoint: {
        graphql: string;
    };
}
