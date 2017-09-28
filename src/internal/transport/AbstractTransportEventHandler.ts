import { HandlerContext } from "../../HandlerContext";
import { HandlerResult } from "../../HandlerResult";
import { EventFired } from "../../Handlers";
import { AutomationEventListener } from "../../server/AutomationEventListener";
import { AutomationServer } from "../../server/AutomationServer";
import { GraphClient } from "../../spi/graph/GraphClient";
import { MessageClient } from "../../spi/message/MessageClient";
import { CommandInvocation } from "../invoker/Payload";
import * as namespace from "../util/cls";
import { CommandIncoming, EventIncoming, TransportEventHandler } from "./TransportEventHandler";
import { HandlerResponse, StatusMessage } from "./websocket/WebSocketMessageClient";

export abstract class AbstractTransportEventHandler implements TransportEventHandler {

    constructor(protected automations: AutomationServer, protected listeners: AutomationEventListener[] = []) {}

    public onCommand(command: CommandIncoming): Promise<HandlerResult> {
        const np = namespace.get();
        const ci: CommandInvocation = {
            name: command.name,
            args: command.parameters,
            mappedParameters: command.mapped_parameters,
            secrets: command.secrets,
        };
        const ctx: HandlerContext = {
            teamId: command.team.id,
            correlationId: command.corrid,
            invocationId: np ? np.invocationId : undefined,
            messageClient: this.createMessageClient(command),
            graphClient: this.createGraphClient(command),
        };

        this.listeners.forEach(l => l.commandStarting(ci, ctx));

        return this.automations.invokeCommand(ci, ctx)
            .then(result => {
                this.listeners.forEach(l => l.commandSuccessful(ci, ctx, result));
                this.sendStatus(result.code === 0 ? true : false, result, command);
                return result;
            }).catch( error => {
                this.listeners.forEach(l => l.commandFailed(ci, ctx, error));
                this.sendStatus(false, { code: 1 } , command);
                return error;
            });
    }

    public onEvent(event: EventIncoming): Promise<HandlerResult[]> {
        const np = namespace.get();
        const ef: EventFired<any> = {
            data: event.data,
            extensions: {
                operationName: event.extensions.operationName,
            },
            secrets: event.secrets,
        };
        const ctx: HandlerContext = {
            teamId: event.extensions.team_id,
            correlationId: event.extensions.correlation_id,
            invocationId: np ? np.invocationId : undefined,
            messageClient: this.createMessageClient(event),
            graphClient: this.createGraphClient(event),
        };

        this.listeners.forEach(l => l.eventStarting(ef, ctx));

        return this.automations.onEvent(ef, ctx)
            .then(result => {
                this.listeners.forEach(l => l.eventSuccessful(ef, ctx, result));
                return result;
            })
            .catch( error => {
                this.listeners.forEach(l => l.eventFailed(ef, ctx, error));
                return error;
            });
    }

    public sendStatus(success: boolean, hr: HandlerResult, request: CommandIncoming) {
        // send success message back
        const status: StatusMessage = {
            status: success ? "success" : "failure",
            code: hr.code,
            message: `${success ? "Successfully" : "Unsuccessfully"} invoked command-handler` +
            ` ${request.name} of ${this.automations.rugs.name}@${this.automations.rugs.version}`,
        };
        const response: HandlerResponse = {
            rug: request.rug,
            corrid: request.corrid,
            correlation_context: request.correlation_context,
            content_type: "application/x-atomist-status+json",
            message: JSON.stringify(status),
        };
        this.sendMessage(response);
    }

    protected abstract sendMessage(payload: any);

    protected abstract createGraphClient(event: EventIncoming | CommandIncoming): GraphClient;

    protected abstract createMessageClient(event: EventIncoming | CommandIncoming): MessageClient;

}
