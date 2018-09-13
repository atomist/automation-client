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
    AtomistBuild,
    AtomistLinkImage,
    AtomistWebhookType,
    postAtomistWebhook,
    webhookBaseUrl,
} from "./lib/atomistWebhook";

export {
    Configuration,
    configurationValue,
    getUserConfig,
    resolveWorkspaceIds,
    UserConfig,
    userConfigPath,
    writeUserConfig,
} from "./lib/configuration";

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
} from "./lib/decorators";

export { automationClientInstance } from "./lib/globals";

import * as GraphQL from "./lib/graph/graphQL";

export { GraphQL };

export { HandleCommand } from "./lib/HandleCommand";

export {
    EventFired,
    HandleEvent,
} from "./lib/HandleEvent";

export {
    AutomationContextAware,
    ConfigurationAware,
    HandlerContext,
    HandlerLifecycle,
} from "./lib/HandlerContext";

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
} from "./lib/HandlerResult";

export {
    obtainGitInfo,
} from "./lib/internal/env/gitInfo";

export {
    Arg,
    CommandInvocation,
} from "./lib/internal/invoker/Payload";

export * from "./lib/util/logger";

export {
    BitBucketRepoRef,
} from "./lib/operations/common/BitBucketRepoRef";
export {
    BitBucketServerRepoRef,
} from "./lib/operations/common/BitBucketServerRepoRef";
export {
    GitHubRepoRef,
} from "./lib/operations/common/GitHubRepoRef";
export {
    RemoteRepoRef,
    RepoRef,
} from "./lib/operations/common/RepoId";

export { AutomationEventListener } from "./lib/server/AutomationEventListener";

export {
    GraphClient,
    MutationOptions,
    QueryOptions,
} from "./lib/spi/graph/GraphClient";

export * from "./lib/spi/message/MessageClient";

export * from "./lib/util/exec";

export * from "./lib/util/spawn";
