import { HandlerContext } from "../../HandlerContext";
import { HandlerResult } from "../../HandlerResult";
import { EventFired } from "../../Handlers";
import { AutomationServer } from "../../server/AutomationServer";
import { GraphClient } from "../../spi/graph/GraphClient";
import { MessageClient } from "../../spi/message/MessageClient";
import { CommandInvocation } from "../invoker/Payload";
import { AutomationEventListener, CommandIncoming, EventIncoming } from "./AutomationEventListener";
import { HandlerResponse, StatusMessage } from "./websocket/WebSocketMessageClient";

export abstract class AbstractAutomationEventListener implements AutomationEventListener {

    constructor(protected automations: AutomationServer) {}

    public onCommand(command: CommandIncoming): Promise<HandlerResult> {

        const ci: CommandInvocation = {
            name: command.name,
            args: command.parameters,
            mappedParameters: command.mapped_parameters,
            secrets: command.secrets,
        };
        const ctx: HandlerContext = {
            teamId: command.team.id,
            correlationId: command.corrid,
            messageClient: this.createMessageClient(command),
            graphClient: this.createGraphClient(command),
        };
        return this.automations.invokeCommand(ci, ctx)
            .then(result => {
                this.sendStatus(result.code === 0 ? true : false, result, command);
                return result;
            }).catch( error => {
                this.sendStatus(false, { code: 1 } , command);
                return error;
            });
    }

    public onEvent(event: EventIncoming): Promise<HandlerResult[]> {
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
            messageClient: this.createMessageClient(event),
            graphClient: this.createGraphClient(event),
        };
        return this.automations.onEvent(ef, ctx);
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
