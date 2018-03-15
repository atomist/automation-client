import {Automations} from "../../metadata/metadata";
import {RegistrationConfirmation} from "./WebSocketRequestProcessor";

export function celebrateRegistration(webSocketRequestProcessorName: string,
                                      registration: RegistrationConfirmation,
                                      automations: Automations): string {
    return `
/-----------------------------\
| - Registered with Atomist - |
|-----------------------------|
| Team: ${automations.team_ids.join("\, ")}
| automation name: ${registration.name}
| version: ${registration.version}
| web socket processor: ${webSocketRequestProcessorName}
| ${automations.commands.length} commands
| ${automations.events.length} events
\-----------------------------/`;
}
