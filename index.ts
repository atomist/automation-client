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
    webhookBaseUrl,
} from "./lib/atomistWebhook";
export {
    AutomationClient,
} from "./lib/automationClient";
export {
    AnyOptions,
    BannerSection,
    Configuration,
    ConfigurationPostProcessor,
    configurationValue,
} from "./lib/configuration";
export {
    MappedParameter,
    MappedParameters,
    Parameter,
    Parameters,
    Secret,
    Secrets,
    Tags,
    Value,
} from "./lib/decorators";
export {
    automationClientInstance,
} from "./lib/globals";
import * as GraphQL from "./lib/graph/graphQL";
import * as validationPatterns from "./lib/operations/common/params/validationPatterns";
import * as editModes from "./lib/operations/edit/editModes";
import * as parseUtils from "./lib/project/util/parseUtils";
import * as projectUtils from "./lib/project/util/projectUtils";
import * as secured from "./lib/secured";
import * as astUtils from "./lib/tree/ast/astUtils";
import * as matchTesters from "./lib/tree/ast/matchTesters";

export { GraphQL };
export {
    EventFired,
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
    reduceResults,
    success,
    Success,
    SuccessPromise,
} from "./lib/HandlerResult";
export {
    CommandInvocation,
} from "./lib/internal/invoker/Payload";
export {
    BaseParameter,
} from "./lib/internal/metadata/decoratorSupport";
export {
    CommandIncoming,
    EventIncoming,
    RequestProcessor,
} from "./lib/internal/transport/RequestProcessor";

export {
    registerShutdownHook,
} from "./lib/internal/util/shutdown";
export {
    guid,
    toStringArray,
} from "./lib/internal/util/string";
export {
    OnCommand,
} from "./lib/onCommand";
export {
    OnEvent,
} from "./lib/onEvent";
export {
    BitBucketServerRepoRef,
} from "./lib/operations/common/BitBucketServerRepoRef";
export {
    gitHubRepoLoader,
} from "./lib/operations/common/gitHubRepoLoader";
export {
    GitHubRepoRef,
} from "./lib/operations/common/GitHubRepoRef";
export {
    RemoteLocator,
} from "./lib/operations/common/params/RemoteLocator";
export { validationPatterns };
export {
    ProjectOperationCredentials,
    TokenCredentials,
} from "./lib/operations/common/ProjectOperationCredentials";
export {
    RemoteRepoRef,
    RepoId,
    RepoRef,
    SimpleRepoId,
} from "./lib/operations/common/RepoId";
export {
    RepoFilter,
} from "./lib/operations/common/repoFilter";
export {
    RepoFinder,
} from "./lib/operations/common/repoFinder";
export {
    RepoLoader,
} from "./lib/operations/common/repoLoader";
export {
    SourceLocation,
} from "./lib/operations/common/SourceLocation";
export {
    EditMode,
} from "./lib/operations/edit/editModes";
export { editModes };
export {
    SimpleProjectEditor,
} from "./lib/operations/edit/projectEditor";
export {
    ProjectPersister,
} from "./lib/operations/generate/generatorUtils";
export {
    GitlabRepoCreationParameters,
} from "./lib/operations/generate/GitlabRepoCreationParameters";
export {
    RepoCreationParameters,
} from "./lib/operations/generate/RepoCreationParameters";
export {
    SeedDrivenGeneratorParameters,
} from "./lib/operations/generate/SeedDrivenGeneratorParameters";
export {
    DefaultReviewComment,
    ProjectReview,
    ReviewComment,
    reviewCommentSorter,
    ReviewResult,
    Severity,
} from "./lib/operations/review/ReviewResult";
export {
    Tagger,
    TaggerTags,
    unifiedTagger,
} from "./lib/operations/tagger/Tagger";
export {
    File as ProjectFile,
} from "./lib/project/File";
export * from "./lib/project/fileGlobs";
export {
    Fingerprint as FingerprintData,
} from "./lib/project/fingerprint/Fingerprint";
export {
    GitCommandGitProject,
} from "./lib/project/git/GitCommandGitProject";
export {
    GitProject,
    GitPushOptions,
} from "./lib/project/git/GitProject";
export {
    GitStatus,
} from "./lib/project/git/gitStatus";
export {
    isLocalProject,
    LocalProject,
} from "./lib/project/local/LocalProject";
export {
    NodeFsLocalProject,
} from "./lib/project/local/NodeFsLocalProject";
export {
    InMemoryFile as InMemoryProjectFile,
} from "./lib/project/mem/InMemoryFile";
export {
    InMemoryProject,
} from "./lib/project/mem/InMemoryProject";
export {
    Project,
    ProjectAsync,
} from "./lib/project/Project";
export {
    doWithJson,
} from "./lib/project/util/jsonUtils";
export { parseUtils };
export { projectUtils };
export { secured };
export {
    AutomationEventListener,
    AutomationEventListenerSupport,
} from "./lib/server/AutomationEventListener";
export {
    NoParameters,
    SmartParameters,
    ValidationError,
    ValidationResult,
    ParameterType,
    ParameterIndexType,
} from "./lib/SmartParameters";
export {
    CloneOptions,
} from "./lib/spi/clone/DirectoryManager";
export * from "./lib/spi/graph/GraphClient";
export * from "./lib/spi/http/axiosHttpClient";
export * from "./lib/spi/http/curlHttpClient";
export * from "./lib/spi/http/httpClient";
export * from "./lib/spi/message/MessageClient";
export { astUtils };
export { matchTesters };

export {
    MatchResult,
    ZapTrailingWhitespace,
} from "./lib/tree/ast/FileHits";
export {
    FileParser,
} from "./lib/tree/ast/FileParser";
export {
    FileParserRegistry,
} from "./lib/tree/ast/FileParserRegistry";
export {
    TypeScriptES6FileParser,
} from "./lib/tree/ast/typescript/TypeScriptFileParser";
export {
    MicrogrammarBasedFileParser,
} from "./lib/tree/ast/microgrammar/MicrogrammarBasedFileParser";
export {
    RegexFileParser,
} from "./lib/tree/ast/regex/RegexFileParser";
export {
    WritableLog,
} from "./lib/util/child_process";
export * from "./lib/util/exec";
export {
    deepLink,
    Issue,
    raiseIssue,
} from "./lib/util/gitHub";
export {
    addLogRedaction,
    LoggingFormat,
    LoggingConfiguration,
    NoLogging,
    PlainLogging,
    MinimalLogging,
    ClientLogging,
    configureLogging,
    clientLoggingConfiguration,
    Logger,
    LogMethod,
    LeveledLogMethod,
    LogCallback,
    logger,
} from "./lib/util/logger";
export {
    doWithRetry,
    RetryOptions,
} from "./lib/util/retry";
export {
    executeAll,
} from "./lib/util/pool";
export * from "./lib/util/spawn";
export {
    Maker,
} from "./lib/util/constructionUtils";
export * from "./lib/operations/common/gitlabRepoLoader";
export * from "./lib/operations/common/GitlabPrivateTokenCredentials";
export * from "./lib/operations/common/GitlabRepoRef";
export * from "./lib/operations/generate/GitlabRepoCreationParameters";
export {
    ApolloGraphClient,
} from "./lib/graph/ApolloGraphClient";
export {
    ApolloGraphClientFactory,
} from "./lib/graph/ApolloGraphClientFactory";
export {
    GraphClientFactory,
    DefaultGraphClientFactory,
} from "./lib/spi/graph/GraphClientFactory";
export {
    AxiosHttpClient,
    AxiosHttpClientFactory,
} from "./lib/spi/http/axiosHttpClient";
export {
    CurlHttpClient,
    CurlHttpClientFactory,
} from "./lib/spi/http/curlHttpClient";
export {
    HttpClientFactory,
    DefaultHttpClientFactory,
    DefaultHttpClientOptions,
    HttpClient,
    HttpClientOptions,
    HttpMethod,
    HttpResponse,
} from "./lib/spi/http/httpClient";
export {
    WSWebSocketFactory,
    WebSocketFactory,
    DefaultWebSocketFactory,
} from "./lib/spi/http/wsClient";
