// Deprecated
// Included only for backward compatibility. Import from root.

import {
    CommandHandler,
    EventHandler,
    MappedParameter,
    MappedParameters,
    Parameter,
    Secret,
    Tags,
} from "./decorators";
import { HandleCommand } from "./HandleCommand";
import {
    EventFired,
    HandleEvent,
} from "./HandleEvent";
import { HandlerContext } from "./HandlerContext";
import {
    Failure,
    failure,
    HandlerResult,
    RedirectResult,
    success,
    Success,
} from "./HandlerResult";

export {
    HandlerResult,
    HandlerContext,
    HandleCommand,
    HandleEvent,
    EventFired,
    Success,
    success,
    Failure,
    failure,
    RedirectResult,
};
export {
    EventHandler,
    Parameter,
    CommandHandler,
    MappedParameter,
    Secret,
    Tags,
};

export { MappedParameters, Secrets } from "./decorators";
