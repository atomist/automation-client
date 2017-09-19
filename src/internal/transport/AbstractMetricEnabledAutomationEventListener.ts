import { HandlerResult } from "../../HandlerResult";
import { AutomationServer } from "../../server/AutomationServer";
import { duration } from "../util/metric";
import { AbstractEventStoringAutomationEventListener } from "./AbstractEventStoringAutomationEventListener";
import { CommandIncoming, EventIncoming } from "./AutomationEventListener";

export abstract class AbstractMetricEnabledAutomationEventListener extends AbstractEventStoringAutomationEventListener {

    constructor(protected automations: AutomationServer) {
        super(automations);
    }

    public onCommand(command: CommandIncoming): Promise<HandlerResult> {
        const start = new Date().getTime();
        return super.onCommand(command)
            .then(result  => {
                duration(`command_handler.${command.name}.success`, new Date().getTime() - start);
                duration(`command_handler.global`, new Date().getTime() - start);
                return result;
            })
            .catch(error => {
                duration(`command_handler.${command.name}.failure`, new Date().getTime() - start);
                duration(`command_handler.global`, new Date().getTime() - start);
                throw error;
            });
    }

    public onEvent(event: EventIncoming): Promise<HandlerResult[]> {
        const start = new Date().getTime();
        return super.onEvent(event)
            .then(result  => {
                duration(`event_handler.${event.extensions.operationName}.success`,
                    new Date().getTime() - start);
                duration(`event_handler.global`, new Date().getTime() - start);
                return result;
            })
            .catch(error => {
                duration(`event_handler.${event.extensions.operationName}.failure`,
                    new Date().getTime() - start);
                duration(`event_handler.global`, new Date().getTime() - start);
                throw error;
            });
    }
}
