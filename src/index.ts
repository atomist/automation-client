export { Configuration } from "./configuration";

export {
    CommandHandler,
    ConfigurableCommandHandler,
    EventHandler,
    MappedParameter,
    MappedParameters,
    Parameter,
    Parameters,
    Secret,
    Secrets,
    Tags,
} from "./decorators";

export { HandleCommand } from "./HandleCommand";

export {
    EventFired,
    HandleEvent,
} from "./HandleEvent";

export {
    HandlerContext,
    AutomationContextAware,
    HandlerLifecycle,
} from "./HandlerContext";

export {
    Failure,
    failure,
    HandlerResult,
    RedirectResult,
    success,
    Success,
    SuccessPromise,
} from "./HandlerResult";

import * as GraphQL from "./graph/graphQL";
export { GraphQL };

export { logger } from "./internal/util/logger";

export {
    type,
    IngesterBuilder,
    ingester,
} from "./ingesters";

export { AutomationEventListener } from "./server/AutomationEventListener";
