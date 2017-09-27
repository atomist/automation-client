import { DefaultGraphQLServer } from "../../../automationClient";
import { jwtToken } from "../../../globals";
import { ApolloGraphClient } from "../../../graph/ApolloGraphClient";
import { AutomationEventListener } from "../../../server/AutomationEventListener";
import { AutomationServer } from "../../../server/AutomationServer";
import { GraphClient } from "../../../spi/graph/GraphClient";
import { MessageClient } from "../../../spi/message/MessageClient";
import { debugMessageClient } from "../../message/DebugMessageClient";
import { AbstractEventStoringTransportEventHandler } from "../AbstractEventStoringTransportEventHandler";
import { CommandIncoming, EventIncoming} from "../TransportEventHandler";

export class DefaultExpressTransportEventHandler extends AbstractEventStoringTransportEventHandler {

    constructor(automations: AutomationServer, protected listeners: AutomationEventListener[] = []) {
        super(automations, listeners);
    }

    protected sendMessage(payload: any) {
        debugMessageClient.respond(JSON.stringify(payload, null, 2));
    }

    protected createGraphClient(event: CommandIncoming | EventIncoming): GraphClient {
        return new ApolloGraphClient(DefaultGraphQLServer,
            { Authorization: `Bearer ${jwtToken()}`});
    }

    protected doCreateMessageClient(event: CommandIncoming | EventIncoming): MessageClient {
        return debugMessageClient;
    }
}
