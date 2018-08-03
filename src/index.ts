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
    HandleCommand,
    SelfDescribingHandleCommand,
} from "./HandleCommand";
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
    Failure,
    FailurePromise,
    HandlerError,
    HandlerResult,
    RedirectResult,
    Success,
    SuccessPromise,
    failure,
    reduceResults,
    success,
} from "./HandlerResult";
export {
    CommandHandler,
    EventFired,
    EventHandler,
    HandleCommand,
    HandleEvent,
    HandlerContext,
    HandlerResult,
    MappedParameter,
    MappedParameters,
    Parameter,
    Secret,
    Secrets,
    Success,
    Tags,
    failure,
} from "./Handlers";
export {
    NoParameters,
    SmartParameters,
    ValidationError,
} from "./SmartParameters";
export {
    ActionResult,
    successOn,
} from "./action/ActionResult";
export {
    CommandResult,
    runCommand,
} from "./action/cli/commandLine";
export {
    AtomistBuild,
    AtomistLinkImage,
    AtomistWebhookType,
    postAtomistWebhook,
    webhookBaseUrl,
} from "./atomistWebhook";
export {
    AutomationClient,
    automationClient,
    automationClientInstance,
} from "./automationClient";
export {
    AnyOptions,
    BannerSection,
    Configuration,
    UserConfig,
    configurationValue,
    defaultConfiguration,
    getUserConfig,
    invokePostProcessors,
    resolveTeamIds,
    resolveToken,
    resolveWorkspaceIds,
    userConfigPath,
    writeUserConfig,
} from "./configuration";
export {
    CommandHandler,
    ConfigurableCommandHandler,
    EventHandler,
    Ingestor,
    MappedParameter,
    MappedParameters,
    Parameter,
    Parameters,
    Secret,
    Secrets,
    Tags,
    Value,
} from "./decorators";
export {
    automationClientInstance,
    eventStore,
    setEventStore,
} from "./globals";
export { ApolloGraphClient } from "./graph/ApolloGraphClient";
export {
    ingester,
    subscription,
} from "./graph/graphQL";
export {
    IngesterBuilder,
    buildEnum,
    buildIngester,
    buildType,
    ingester,
    type,
} from "./ingesters";
export { obtainGitInfo } from "./internal/env/gitInfo";
export {
    Arg,
    CommandInvocation,
    Secret,
} from "./internal/invoker/Payload";
export { ConsoleMessageClient } from "./internal/message/ConsoleMessageClient";
export {
    BaseParameter,
    declareMappedParameter,
    declareParameter,
    declareSecret,
} from "./internal/metadata/decoratorSupport";
export { isCommandHandlerMetadata } from "./internal/metadata/metadata";
export { metadataFromInstance } from "./internal/metadata/metadataReading";
export {
    possibleAxiosObjectReplacer,
    replacer,
} from "./internal/transport/AbstractRequestProcessor";
export {
    CommandIncoming,
    EventIncoming,
    RequestProcessor,
    Source,
} from "./internal/transport/RequestProcessor";
export { RegistrationConfirmation } from "./internal/transport/websocket/WebSocketRequestProcessor";
export { info } from "./internal/util/info";
export {
    LoggingConfig,
    logger,
} from "./internal/util/logger";
export {
    guid,
    toStringArray,
} from "./internal/util/string";
export {
    CommandHandlerMetadata,
    EventHandlerMetadata,
    MappedParameterDeclaration,
    Parameter,
} from "./metadata/automationMetadata";
export {
    OnCommand,
    commandHandlerFrom,
} from "./onCommand";
export {
    OnEvent,
    eventHandlerFrom,
} from "./onEvent";
export { CommandDetails } from "./operations/CommandDetails";
export { AbstractRemoteRepoRef } from "./operations/common/AbstractRemoteRepoRef";
export { BitBucketServerRepoRef } from "./operations/common/BitBucketServerRepoRef";
export {
    GitHubDotComBase,
    GitHubRepoRef,
    isGitHubRepoRef,
} from "./operations/common/GitHubRepoRef";
export {
    ProjectOperationCredentials,
    TokenCredentials,
    isTokenCredentials,
} from "./operations/common/ProjectOperationCredentials";
export {
    RemoteRepoRef,
    RepoId,
    RepoRef,
    SimpleRepoId,
} from "./operations/common/RepoId";
export { SourceLocation } from "./operations/common/SourceLocation";
export { allReposInTeam } from "./operations/common/allReposInTeamRepoFinder";
export { defaultRepoLoader } from "./operations/common/defaultRepoLoader";
export {
    fromListRepoFinder,
    fromListRepoLoader,
} from "./operations/common/fromProjectList";
export { gitHubRepoLoader } from "./operations/common/gitHubRepoLoader";
export { twoTierDirectoryRepoFinder } from "./operations/common/localRepoFinder";
export { AlwaysAskRepoParameters } from "./operations/common/params/AlwaysAskRepoParameters";
export {
    BaseEditorOrReviewerParameters,
    EditorOrReviewerParameters,
} from "./operations/common/params/BaseEditorOrReviewerParameters";
export { FallbackParams } from "./operations/common/params/FallbackParams";
export { GitHubTargetsParams } from "./operations/common/params/GitHubTargetsParams";
export { MappedRepoParameters } from "./operations/common/params/MappedRepoParameters";
export { RemoteLocator } from "./operations/common/params/RemoteLocator";
export { TargetsParams } from "./operations/common/params/TargetsParams";
export {
    GitBranchRegExp,
    GitHubNameRegExp,
    GitShaRegExp,
} from "./operations/common/params/gitHubPatterns";
export {
    AllRepos,
    RepoFilter,
    andFilter,
} from "./operations/common/repoFilter";
export { RepoFinder } from "./operations/common/repoFinder";
export { RepoLoader } from "./operations/common/repoLoader";
export { doWithAllRepos } from "./operations/common/repoUtils";
export {
    editAll,
    editOne,
} from "./operations/edit/editAll";
export {
    BranchCommit,
    CustomExecutionEditMode,
    EditMode,
    PullRequest,
    commitToMaster,
    isPullRequest,
} from "./operations/edit/editModes";
export { editorHandler } from "./operations/edit/editorToCommand";
export {
    AnyProjectEditor,
    EditResult,
    ProjectEditor,
    SimpleProjectEditor,
    failedEdit,
    successfulEdit,
    toEditor,
} from "./operations/edit/projectEditor";
export {
    chainEditors,
    combineEditResults,
} from "./operations/edit/projectEditorOps";
export { GitHubRepoCreationParameters } from "./operations/generate/GitHubRepoCreationParameters";
export { NewRepoCreationParameters } from "./operations/generate/NewRepoCreationParameters";
export { RepoCreationParameters } from "./operations/generate/RepoCreationParameters";
export { SeedDrivenGeneratorParameters } from "./operations/generate/SeedDrivenGeneratorParameters";
export {
    UniversalSeed,
    cleanReadMe,
} from "./operations/generate/UniversalSeed";
export {
    EditorFactory,
    GeneratorCommandDetails,
} from "./operations/generate/generatorToCommand";
export {
    ProjectPersister,
    generate,
} from "./operations/generate/generatorUtils";
export { GitHubProjectPersister } from "./operations/generate/gitHubProjectPersister";
export { JavaSeed } from "./operations/generate/java/JavaSeed";
export { SpringBootProjectStructure } from "./operations/generate/java/SpringBootProjectStructure";
export { SpringBootSeed } from "./operations/generate/java/SpringBootSeed";
export { movePackage } from "./operations/generate/java/javaProjectUtils";
export { updatePom } from "./operations/generate/java/updatePom";
export { RemoteGitProjectPersister } from "./operations/generate/remoteGitProjectPersister";
export { addAtomistWebhook } from "./operations/generate/support/addAtomistWebhook";
export {
    DefaultReviewComment,
    Fix,
    ProjectReview,
    ReviewComment,
    ReviewResult,
    Severity,
    clean,
} from "./operations/review/ReviewResult";
export { ProjectReviewer } from "./operations/review/projectReviewer";
export { reviewAll } from "./operations/review/reviewAll";
export {
    ReviewRouter,
    ReviewerCommandDetails,
    reviewerHandler,
} from "./operations/review/reviewerToCommand";
export { editRepo } from "./operations/support/editorUtils";
export {
    DefaultTags,
    TagRouter,
    Tagger,
    Tags,
} from "./operations/tagger/Tagger";
export { taggerHandler } from "./operations/tagger/taggerHandler";
export { File } from "./project/File";
export {
    FileStream,
    Project,
    ProjectAsync,
    ProjectNonBlocking,
    isProject,
} from "./project/Project";
export { Action } from "./project/diff/Action";
export { Chain } from "./project/diff/Chain";
export { Changes } from "./project/diff/Changes";
export { Differ } from "./project/diff/Differ";
export {
    DifferenceEngine,
    GithubIssueAuth,
} from "./project/diff/DifferenceEngine";
export { Extractor } from "./project/diff/Extractor";
export { AllFiles } from "./project/fileGlobs";
export { Fingerprint } from "./project/fingerprint/Fingerprint";
export { Configurable } from "./project/git/Configurable";
export {
    DefaultDirectoryManager,
    GitCommandGitProject,
} from "./project/git/GitCommandGitProject";
export {
    GitProject,
    GitPushOptions,
} from "./project/git/GitProject";
export { GitStatus } from "./project/git/gitStatus";
export {
    LocalProject,
    ReleaseFunction,
    isLocalProject,
} from "./project/local/LocalProject";
export { NodeFsLocalProject } from "./project/local/NodeFsLocalProject";
export { InMemoryFile } from "./project/mem/InMemoryFile";
export { InMemoryProject } from "./project/mem/InMemoryProject";
export { AbstractProject } from "./project/support/AbstractProject";
export { diagnosticDump } from "./project/util/diagnosticUtils";
export { doWithJson } from "./project/util/jsonUtils";
export {
    doWithAtMostOneMatch,
    doWithFileMatches,
    doWithMatches,
    doWithUniqueMatch,
    findMatches,
} from "./project/util/parseUtils";
export {
    doWithFiles,
    fileExists,
    saveFromFiles,
    saveFromFilesAsync,
    toPromise,
} from "./project/util/projectUtils";
export { isGitHubTeamMember } from "./secured";
export {
    AutomationEventListener,
    AutomationEventListenerSupport,
} from "./server/AutomationEventListener";
export { CachingDirectoryManager } from "./spi/clone/CachingDirectoryManager";
export { EventStore } from "./spi/event/EventStore";
export {
    GraphClient,
    MutationOptions,
    QueryNoCacheOptions,
    QueryOptions,
} from "./spi/graph/GraphClient";
export { CurlHttpClientFactory } from "./spi/http/curlHttpClient";
export {
    HttpClientFactory,
    HttpMethod,
} from "./spi/http/httpClient";
export {
    ButtonSpecification,
    CommandReferencingAction,
    CustomEventDestination,
    Destination,
    MenuSpecification,
    MessageClient,
    MessageOptions,
    OptionGroup,
    SlackDestination,
    SlackFileMessage,
    SlackMessageClient,
    addressEvent,
    addressSlackChannels,
    addressSlackUsers,
    buttonForCommand,
    isSlackMessage,
    menuForCommand,
    mergeParameters,
} from "./spi/message/MessageClient";
export {
    DefaultSlackMessageClient,
    MessageClientSupport,
} from "./spi/message/MessageClientSupport";
export { LocatedTreeNode } from "./tree/LocatedTreeNode";
export {
    MatchResult,
    ZapTrailingWhitespace,
} from "./tree/ast/FileHits";
export { FileParser } from "./tree/ast/FileParser";
export { FileParserRegistry } from "./tree/ast/FileParserRegistry";
export {
    findFileMatches,
    findMatches,
    zapAllMatches,
} from "./tree/ast/astUtils";
export { TypeScriptES6FileParser } from "./tree/ast/typescript/TypeScriptFileParser";
export {
    Maker,
    toFactory,
} from "./util/constructionUtils";
export {
    Issue,
    deepLink,
    fileContent,
    githubDeepLink,
    raiseIssue,
} from "./util/gitHub";
export {
    RetryOptions,
    doWithRetry,
} from "./util/retry";
export {
    ChildProcessResult,
    ErrorFinder,
    SpawnCommand,
    SpawnWatchOptions,
    SuccessIsReturn0ErrorFinder,
    WritableLog,
    asSpawnCommand,
    poisonAndWait,
    spawnAndWatch,
    stringifySpawnCommand,
} from "./util/spawned";

import * as GraphQL from "./graph/graphQL";
export { GraphQL };
