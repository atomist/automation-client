import { DefaultStagingAtomistGraphQLServer } from "../../../automationClient";
import { getJwtToken } from "../../../globals";
import { ApolloGraphClient } from "../../../graph/ApolloGraphClient";
import { AutomationServer } from "../../../server/AutomationServer";
import { GraphClient } from "../../../spi/graph/GraphClient";
import { MessageClient } from "../../../spi/message/MessageClient";
import { debugMessageClient } from "../../message/DebugMessageClient";
import { AbstractMetricEnabledAutomationEventListener } from "../AbstractMetricEnabledAutomationEventListener";
import { CommandIncoming, EventIncoming} from "../AutomationEventListener";

export class DefaultExpressAutomationEventListener extends AbstractMetricEnabledAutomationEventListener {

    constructor(automations: AutomationServer) {
        super(automations);
    }

    protected sendMessage(payload: any) {
        debugMessageClient.respond(JSON.stringify(payload, null, 2));
    }

    protected createGraphClient(event: CommandIncoming | EventIncoming): GraphClient {
        return new ApolloGraphClient(DefaultStagingAtomistGraphQLServer,
            { Authorization: `Bearer ${getJwtToken()}`});
    }

    protected doCreateMessageClient(event: CommandIncoming | EventIncoming): MessageClient {
        return debugMessageClient;
    }
}
