import * as bodyParser from "body-parser";
import * as express from "express";
import * as basicAuth from "express-basic-auth";
import { AutomationServer } from "../../../server/AutomationServer";
import { CommandHandlerMetadata, IngestorMetadata } from "../../metadata/metadata";

import * as appRoot from "app-root-path";
import * as mustacheExpress from "mustache-express";

import { Express } from "express";
import * as fs from "fs";
import * as os from "os";
import { DefaultStagingAtomistGraphQLServer } from "../../../automationClient";
import { getJwtToken } from "../../../globals";
import { eventStore } from "../../event/InMemoryEventStore";
import { logger } from "../../util/logger";
import { report } from "../../util/metric";
import { guid } from "../../util/string";
import { AutomationEventListener, CommandIncoming, EventIncoming } from "../AutomationEventListener";

/**
 * Registers an endpoint for every automation and exposes
 * metadataFromInstance at root. Responsible for marshalling into the appropriate structure
 */
export class ExpressServer {

    constructor(private automations: AutomationServer,
                private options: ExpressServerOptions = { port: 2866, basicAuth: { enabled: true} },
                private listeners: AutomationEventListener[] = []) {

        const exp = express();

        exp.engine("html", mustacheExpress());
        exp.set("view engine", "mustache");
        // TODO that's probably not the way it should work; but it does work when using this inside a node_module

        if (fs.existsSync(appRoot + "/views")) {
            exp.set("views", appRoot + "/views");
        } else {
            exp.set("views", appRoot + "/node_modules/@atomist/automation-node/views");
        }
        if (fs.existsSync(appRoot + "/public")) {
            exp.use(express.static(appRoot + "/public"));
        } else {
            exp.use(express.static(appRoot + "/node_modules/@atomist/automation-node/public"));
        }

        exp.use(bodyParser.json());

        if (this.options.basicAuth && this.options.basicAuth.enabled) {
            const username = this.options.basicAuth.username ? this.options.basicAuth.username : "admin";
            const password = this.options.basicAuth.password ? this.options.basicAuth.password : guid();
            const user = {};
            user[username] = password;

            exp.use(basicAuth({
                users: user,
                challenge: true,
            }));

            if (!this.options.basicAuth.password) {
                logger.info(`Auto-generated password for web endpoints is '${password}'`);
            }
         }

        exp.get("/automations.json", (req, res) => {
            res.setHeader("Content-Type", "application/json");
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.send(automations.rugs);
        });

        exp.get("/metrics.json", (req, res) => {
            res.setHeader("Content-Type", "application/json");
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.send(JSON.stringify(report.summary()));
        });

        exp.get("/events.json", (req, res) => {
            res.setHeader("Content-Type", "application/json");
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.send(JSON.stringify(eventStore.events(req.query.from)));
        });

        exp.get("/commands.json", (req, res) => {
            res.setHeader("Content-Type", "application/json");
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.send(JSON.stringify(eventStore.commands(req.query.from)));
        });

        exp.get("/messages.json", (req, res) => {
            res.setHeader("Content-Type", "application/json");
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.send(JSON.stringify(eventStore.messages(req.query.from)));
        });

        exp.get("/graphql", (req, res) => {
            res.render("graphql.html", { token: getJwtToken(), graphQLUrl: DefaultStagingAtomistGraphQLServer });
        });

        this.exposeIndex(exp, automations);

        automations.rugs.commands.forEach(
            h => {
                this.exposeCommandHandlerInvocationRoute(exp,
                    "/command/" + h.name, h,
                    (res, result) => res.send(result));
                this.exposeCommandHandlerInvocationRoute(exp,
                    `/command/run-${h.name}.html`, h,
                    (res, result) => res.render("invoked.html", result));
                this.exposeHtmlFormRoute(exp, h);
            },
        );
        automations.rugs.ingestors.forEach(
            i => {
           this.exposeEventInvocationRoute(exp, "/" + i.route, i, (res, result) => res.send(result));
        });

        exp.listen(this.options.port, () => {
            logger.info(`Atomist automation dashboard running at 'http://${os.hostname()}:${this.options.port}'`);
        });
    }

    private exposeCommandHandlerInvocationRoute(exp: Express,
                                                url: string,
                                                h: CommandHandlerMetadata,
                                                handle: (res, result) => any) {
        exp.get(url, (req, res) => {
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
                correlation_context: [],
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

    private exposeHtmlFormRoute(exp: Express, h: CommandHandlerMetadata) {
        exp.get("/command/" + h.name + ".html", (req, res) => {
            res.render("commandHandler.html", h);
        });
    }

    private exposeIndex(exp: Express, automations: AutomationServer) {
        exp.get("/home", (req, res) => {
            res.render("home.html", automations.rugs);
        });
    }
}

export interface ExpressServerOptions {

    port: number;
    basicAuth?: {
        enabled: boolean;
        username?: string;
        password?: string;
    };
}
