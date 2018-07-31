/*
 * Copyright © 2018 Atomist, Inc.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

export {
    Configuration,
    configurationValue,
    getUserConfig,
    resolveWorkspaceIds,
    userConfigPath,
    writeUserConfig,
} from "./configuration";

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
    Value,
    Tags,
} from "./decorators";

export { HandleCommand } from "./HandleCommand";

export {
    EventFired,
    HandleEvent,
} from "./HandleEvent";

export {
    AutomationContextAware,
    ConfigurationAware,
    HandlerContext,
    HandlerLifecycle,
} from "./HandlerContext";

export {
    failure,
    Failure,
    FailurePromise,
    HandlerError,
    HandlerResult,
    RedirectResult,
    reduceResults,
    success,
    Success,
    SuccessPromise,
} from "./HandlerResult";

import * as GraphQL from "./graph/graphQL";

export { GraphQL };

export {
    obtainGitInfo,
} from "./internal/env/gitInfo";

export {
    Arg,
    CommandInvocation,
} from "./internal/invoker/Payload";

export {
    logger,
    LoggingConfig,
} from "./internal/util/logger";

export {
    buildEnum,
    buildIngester,
    buildType,
    IngesterBuilder,
} from "./ingesters";

export { AutomationEventListener } from "./server/AutomationEventListener";

export {
    AtomistBuild,
    AtomistLinkImage,
    AtomistWebhookType,
    postAtomistWebhook,
    webhookBaseUrl,
} from "./atomistWebhook";

export { automationClientInstance } from "./globals";
