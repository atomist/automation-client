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
} from "./atomistWebhook";

export {
    Configuration,
    configurationValue,
    getUserConfig,
    resolveWorkspaceIds,
    UserConfig,
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

export { automationClientInstance } from "./globals";

import * as GraphQL from "./graph/graphQL";

export { GraphQL };

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

export {
    obtainGitInfo,
} from "./internal/env/gitInfo";

export {
    Arg,
    CommandInvocation,
} from "./internal/invoker/Payload";

export * from "./util/logger";

export {
    BitBucketRepoRef,
} from "./operations/common/BitBucketRepoRef";
export {
    BitBucketServerRepoRef,
} from "./operations/common/BitBucketServerRepoRef";
export {
    GitHubRepoRef,
} from "./operations/common/GitHubRepoRef";
export {
    RemoteRepoRef,
    RepoRef,
} from "./operations/common/RepoId";

export { AutomationEventListener } from "./server/AutomationEventListener";

export {
    GraphClient,
    MutationOptions,
    QueryOptions,
} from "./spi/graph/GraphClient";

export * from "./spi/message/MessageClient";
