# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/)
and this project adheres to [Semantic Versioning](http://semver.org/).

## [Unreleased](https://github.com/atomist/automation-client-ts/compare/1.4.0...HEAD)

### Added

-   Support sending response messages back into a thread. [dc005f2](https://github.com/atomist/automation-client/commit/dc005f2237b650d2f96ea5206db9a31b7453b1c9)

### Changed

-   Consolidate and make test running smarter. [#517](https://github.com/atomist/automation-client/issues/517)

### Removed

-   Remove remoteRepoFrom. [#522](https://github.com/atomist/automation-client/issues/522)

### Fixed

-   Safely serialze response data from workers. [d827034](https://github.com/atomist/automation-client/commit/d827034a22f091b9136ae6385ff23ca86d2d7737)

## [1.4.0](https://github.com/atomist/automation-client-ts/compare/1.3.0...1.4.0) - 2019-04-15

### Added

-   Maintain internal priority queue of command/event invocations [#512](https://github.com/atomist/automation-client/issues/512)
-   BitBucketServerRepoRef support cloning from specific branch. [#482](https://github.com/atomist/automation-client/issues/482)
-   Support web user_agent in source of incoming command request. [#498](https://github.com/atomist/automation-client/issues/498)
-   Identity tokens in CommandHandlerRequest maps. [#497](https://github.com/atomist/automation-client/issues/497)
-   Create single interface for creating RemoteRepoRef. [#513](https://github.com/atomist/automation-client/issues/513)

### Changed

-   Clearer description for generated repo name. [#493](https://github.com/atomist/automation-client/issues/493)
-   Hide secrets in messages. [ae43b4f](https://github.com/atomist/automation-client/commit/ae43b4ff21e11cd6493b8acac657a440904baf7c)

### Deprecated

-   Session ID being used as Bearer in Authorization header. [#491](https://github.com/atomist/automation-client/issues/491)

### Fixed

-   Handle empty parameter list on incoming command. [#490](https://github.com/atomist/automation-client/issues/490)

## [1.3.0](https://github.com/atomist/automation-client-ts/compare/1.2.0...1.3.0) - 2019-03-14

### Added

-   Provide a dummy id to InMemoryProject. [#438](https://github.com/atomist/automation-client/issues/438)
-   Allow boolean and number parameters types in command requests. [#446](https://github.com/atomist/automation-client/issues/446)
-   Set WebSocketLifecycle on configuration. [6c009bf](https://github.com/atomist/automation-client/commit/6c009bf30f89b3685c208636337d6810338f917e)
-   Provide a way to globally modify chat messages. [#470](https://github.com/atomist/automation-client/issues/470)
-   Add getContentBuffer method to File. [#476](https://github.com/atomist/automation-client/issues/476)
-   Test failure case in doWithFiles. [#471](https://github.com/atomist/automation-client/issues/471)
-   Allow configurationValue without path. [128f8e4](https://github.com/atomist/automation-client/commit/128f8e49081574e5709298fe10b23fa244bc0a0a)
-   Add Namespace support for Gitlab. [#477](https://github.com/atomist/automation-client/issues/477)

### Changed

-   Allow matchIterator to be used to change matches. [#442](https://github.com/atomist/automation-client/issues/442)
-   Various fixes to better support targeting in command handlers. [#441](https://github.com/atomist/automation-client/issues/441)
-   Add support for latest Chooser API contract. [17549fd](https://github.com/atomist/automation-client/commit/17549fdb9ba12b707898e8cfb49e1f1ba61c5d37)
-   Update failure logging for failed repo creations. [#461](https://github.com/atomist/automation-client/issues/461)
-   Fall through to no creds for cloneUrl. [b31ba59](https://github.com/atomist/automation-client/commit/b31ba59eca489d9bfea5528046ed52800f6a7bc5)
-   Remove axios usage and use HttpClientFactory. [#464](https://github.com/atomist/automation-client/issues/464)
-   Update dependencies. [d68fef3](https://github.com/atomist/automation-client/commit/d68fef3d64974677d7ac4b7f1d957b24c65f6a26)
-   Update all deps including graphql-code-generator. [#474](https://github.com/atomist/automation-client/issues/474)

### Deprecated

-   Add support for latest Chooser API contract. [17549fd](https://github.com/atomist/automation-client/commit/17549fdb9ba12b707898e8cfb49e1f1ba61c5d37)
-   Deprecated Chooser type. [60739fc](https://github.com/atomist/automation-client/commit/60739fccd95f0cb8515cf1aea9214daa015de491)

### Removed

-   Remove addAtomistWebhook from see generator params. [4ebe315](https://github.com/atomist/automation-client/commit/4ebe315eda8555dcaad43e910a8ac903c90677f3)

### Fixed

-   Errors in machine function can get swallowed and ignored . [#449](https://github.com/atomist/automation-client/issues/449)
-   Do not swallow exceptions thrown by transforms in generators. [#465](https://github.com/atomist/automation-client/issues/465)
-   Fix typo that crashed it. [#475](https://github.com/atomist/automation-client/issues/475)
-   WebSocket can be destroyed before message sent. [#483](https://github.com/atomist/automation-client/issues/483)
-   Disable TSLint on generated types. [#485](https://github.com/atomist/automation-client/issues/485)

## [1.2.0](https://github.com/atomist/automation-client-ts/compare/1.1.0...1.2.0) - 2018-12-27

### Added

-   Add thread_ts to MessageOptions to address threads. [49b9be7](https://github.com/atomist/automation-client/commit/49b9be713fa6395d16892787958c4f1cf6a444d4)
-   Disable graphql-tag fragment warning. [#419](https://github.com/atomist/automation-client/issues/419)
-   Allow to print out configuration sources during startup. [a255171](https://github.com/atomist/automation-client/commit/a255171da3b88a2bd4422672422f5ad228183bbb)
-   Add HEAD method to HttpClient. [32fbc96](https://github.com/atomist/automation-client/commit/32fbc9654178c8f3425e95ccc07228d8e1f2227b)
-   Gracefully queue messages when the WS disconnects. [#426](https://github.com/atomist/automation-client/issues/426)
-   Introduce `targets.branch` and fix `project.id` to point to correct project. [#434](https://github.com/atomist/automation-client/issues/434)
-   Stronger typing for parameters. [#437](https://github.com/atomist/automation-client/issues/437)

### Changed

-   Tighten typing on menuForCommand and buttonForCommand. [de3b582](https://github.com/atomist/automation-client/commit/de3b5821e69aee02952487aec63759d4ec7faffd)
-   Update registration timeout to 30s. [65d9ba9](https://github.com/atomist/automation-client/commit/65d9ba9fe353c6c4609c35a1cb455bb9f31e26dc)

### Fixed

-   Boolean parameter types are not supported. [#423](https://github.com/atomist/automation-client/issues/423)
-   Introduce `targets.branch` and fix `project.id` to point to correct project. [#434](https://github.com/atomist/automation-client/issues/434)
-   Fix defaulting of targetBranch when raising PR. [6c80f10](https://github.com/atomist/automation-client/commit/6c80f10c5656b8b9d1c838808d65d20020297e54)
-   Logging setting can cause startup hangs. [#435](https://github.com/atomist/automation-client/issues/435)

## [1.1.0](https://github.com/atomist/automation-client-ts/compare/1.0.1...1.1.0) - 2018-12-08

### Added

-   Add review comment sorter. [#402](https://github.com/atomist/automation-client/issues/402)
-   Add gc stats onto statsd. [7639432](https://github.com/atomist/automation-client/commit/7639432a321e8add351f24539b8a5c0b6434d9d7)
-   Add initial Gitlab support. [#399](https://github.com/atomist/automation-client/issues/399)
-   Add low-level child_process promise functions. [#406](https://github.com/atomist/automation-client/issues/406)
-   Add autoSubmit to CommandDetails. [ee0e474](https://github.com/atomist/automation-client/commit/ee0e474a0fede4142fb1c62509ebacccf716b289)
-   Add auth endpoints to configuration. [1680df8](https://github.com/atomist/automation-client/commit/1680df8c434ffff350b3cb4a62a9c985e9dbf282)
-   Add `GraphClientFactory`. [#410](https://github.com/atomist/automation-client/issues/410)
-   Introduce Commit editMode and allow PR to specify base. [#414](https://github.com/atomist/automation-client/issues/414)
-   Introduce promise pool to limit number of concurrent executions. [#417](https://github.com/atomist/automation-client/issues/417)

### Changed

-   Update to latest graphql-code-generator. [#401](https://github.com/atomist/automation-client/issues/401)
-   Extract creation of HTTP and WS clients for registration to proper factories. [#409](https://github.com/atomist/automation-client/issues/409)
-   Introduce Commit editMode and allow PR to specify base. [#414](https://github.com/atomist/automation-client/issues/414)
-   Chunk editAll operations. [#416](https://github.com/atomist/automation-client/issues/416)

### Deprecated

-   Mark existing spawn and exec functions and interfaces as deprecated. [#406](https://github.com/atomist/automation-client/issues/406)

### Fixed

-   Namespace our in process messages. [d0cf724](https://github.com/atomist/automation-client/commit/d0cf724245cd60dddb15de115a2f809481815297)

## [1.0.1](https://github.com/atomist/automation-client-ts/compare/1.0.0-RC.2...1.0.1) - 2018-11-09

### Added

-   Fingerprint api docs added. [#396](https://github.com/atomist/automation-client/issues/396)

## [1.0.0-RC.2](https://github.com/atomist/automation-client-ts/compare/1.0.0-RC.1...1.0.0-RC.2) - 2018-10-30

### Changed

-   Exclude ingesters from gql-gen. [#395](https://github.com/atomist/automation-client/issues/395)

### Removed

-   Delete out-of-date documentation. [#394](https://github.com/atomist/automation-client/issues/394)

## [1.0.0-RC.1](https://github.com/atomist/automation-client-ts/compare/1.0.0-M.5a...1.0.0-RC.1) - 2018-10-15

### Added

-   Add more exports to index. [#389](https://github.com/atomist/automation-client/issues/389)

### Changed

-   **BREAKING** Scope wildcard exports having common names. [#390](https://github.com/atomist/automation-client/issues/390)

### Removed

-   **BREAKING** Clean up exports in index. [#391](https://github.com/atomist/automation-client/issues/391)

### Fixed

-   Error when creating pull request under GitCommandGitProject. [#387](https://github.com/atomist/automation-client/issues/387)

## [1.0.0-M.5a](https://github.com/atomist/automation-client-ts/compare/1.0.0-M.5...1.0.0-M.5a) - 2018-09-28

### Changed

-   Upgrade axios to 0.19.0-beta.1. [#386](https://github.com/atomist/automation-client-ts/issues/386)

## [1.0.0-M.5](https://github.com/atomist/automation-client-ts/compare/1.0.0-M.4...1.0.0-M.5) - 2018-09-26

### Added

-   Export cross-spawn as spawn. [#382](https://github.com/atomist/automation-client-ts/pull/382)

### Changed

-   Use os.homedir() and 127.0.0.1. [#381](https://github.com/atomist/automation-client-ts/pull/381)

### Fixed

-   Make killing processes more cross-platform. [#385](https://github.com/atomist/automation-client-ts/pull/385)

## [1.0.0-M.4](https://github.com/atomist/automation-client-ts/compare/1.0.0-M.3...1.0.0-M.4) - 2018-09-16

### Added

-   Add depth for cloning the master branch. [#9ed45d8](https://github.com/atomist/automation-client-ts/commit/9ed45d8baa91572eec2424987f22368a6101f69b)
-   Add startupSuccessful event. [#9768eaf](https://github.com/atomist/automation-client-ts/commit/9768eafeb185e9b4acb58bf9e0fafb2e23125c8e)
-   Print stack before munching error. [#365](https://github.com/atomist/automation-client-ts/issues/365)
-   Augment and organize export in index. [#378](https://github.com/atomist/automation-client-ts/issues/378)

### Changed

-   Set all execute bits in makeExecutable. [#345](https://github.com/atomist/automation-client-ts/issues/345)
-   Don't default sha to master when cloning repos. [#4410c0b](https://github.com/atomist/automation-client-ts/commit/4410c0b45544536766d061ded92bc2e530caa677)
-   Keep the branch from the RepoRef. [#366](https://github.com/atomist/automation-client-ts/issues/366)
-   **BREAKING** `~/.atomist/client-config.json` should take precedence over `atomist-config.ts`. [#371](https://github.com/atomist/automation-client-ts/issues/371)
-   **BREAKING** Update to Winston 3 and make logging configuration explicit. [#370](https://github.com/atomist/automation-client-ts/issues/370)
-   Upgrade tree-path library. [#375](https://github.com/atomist/automation-client-ts/issues/375)
-   **BREAKING** Make running git commands safer. [#374](https://github.com/atomist/automation-client-ts/issues/374)
-   Change location of schema.json. [#c6ee2b4](https://github.com/atomist/automation-client-ts/commit/c6ee2b4843a193002319796f5b1815d3cfb83454)
-   Replace continuation-local-storage with async hooks for better tracking across async/await calls. [#377](https://github.com/atomist/automation-client-ts/issues/377)
-   **BREAKING** Update to more-standard node project format. [#328](https://github.com/atomist/automation-client-ts/issues/328)

### Fixed

-   Make sure Apollo propagates the GraphQL errors. [#448f89a](https://github.com/atomist/automation-client-ts/commit/448f89aa8bf9c8bcf226f29882dad26267fe665e)
-   No such file or directory `~/.atomist/log`. [#361](https://github.com/atomist/automation-client-ts/issues/361)
-   Running multiple local SDMs causes port collisions. [#364](https://github.com/atomist/automation-client-ts/issues/364)
-   Resolve exec promise when process stdio is closed. [#70145f2](https://github.com/atomist/automation-client-ts/commit/70145f2b2d7a5d0b2fa689f5d561f88416781ec8)

## [1.0.0-M.3](https://github.com/atomist/automation-client-ts/compare/1.0.0-M.2...1.0.0-M.3) - 2018-09-04

### Added

-   On startup, tell people how to get an API key. [#348](https://github.com/atomist/automation-client-ts/issues/348)
-   Add ConfigurationPostProcessor type. [#4dfbb0f](https://github.com/atomist/automation-client-ts/commit/4dfbb0f0cffae9fc45748c558d05d497361bd8c9)
-   Add generic return type to ConfigurationPostProcessor. [#a564fce](https://github.com/atomist/automation-client-ts/commit/a564fce96107017001e4d47afc9dd229c36ba34a)
-   Add support for marking branch commits to auto merge. [#4c8f677](https://github.com/atomist/automation-client-ts/commit/4c8f677d2857f301abedd65d7fe9fe5eb37da56f)
-   Cleanup own tmp directories. [#0de0100](https://github.com/atomist/automation-client-ts/commit/0de0100a7f26d296df808e128d2e785060e4de62)
-   projectUtils.gatherFromMatches to build up data based on pieces of code

### Changed

-   Support author as string or object. [#346](https://github.com/atomist/automation-client-ts/issues/346)
-   If no event handlers are found, return 404 not 500. [#347](https://github.com/atomist/automation-client-ts/issues/347)
-   Do not show links in startup if not registered. [#da0c942](https://github.com/atomist/automation-client-ts/commit/da0c9425b5493588f39a1565d964dc7b17ca67c5)
-   Log under user home directory.
-   Remove dimensions on metrics. [#349](https://github.com/atomist/automation-client-ts/issues/349)
-   **BREAKING** Pull up id to RepoId and remove unused code. [#351](https://github.com/atomist/automation-client-ts/issues/351)
-   Export all of MessageClient. [#352](https://github.com/atomist/automation-client-ts/issues/352)
-   **BREAKING** Remove all deprecations. [#350](https://github.com/atomist/automation-client-ts/issues/350)
-   renamed saveFromFiles to gatherFromFiles, deprecating the old function.

### Fixed

-   Fail when tests fail, remove team/token. [#354](https://github.com/atomist/automation-client-ts/issues/354)

## [1.0.0-M.2](https://github.com/atomist/automation-client-ts/compare/1.0.0-M.1...1.0.0-M.2) - 2018-08-27

### Changed

-   Update Atomist dependencies to 1.0.0-M.1.

### Fixed

-   Properly read client package.json.

## [1.0.0-M.1](https://github.com/atomist/automation-client-ts/compare/0.21.8...1.0.0-M.1) - 2018-08-27

### Changed

-   Prepare for 1.0.0 release.

## [0.21.8](https://github.com/atomist/automation-client-ts/compare/0.21.7...0.21.8) - 2018-08-24

## [0.21.7](https://github.com/atomist/automation-client-ts/compare/0.21.6...0.21.7) - 2018-08-23

## [0.21.6](https://github.com/atomist/automation-client-ts/compare/0.21.5...0.21.6) - 2018-08-23

### Fixed

-   Immediately shut down when no hooks are registered. [#c010ce1](https://github.com/atomist/automation-client-ts/commit/c010ce1ed2f5a888d7c7b605461e53093d35c58f)

## [0.21.5](https://github.com/atomist/automation-client-ts/compare/0.21.4...0.21.5) - 2018-08-23

## [0.21.4](https://github.com/atomist/automation-client-ts/compare/0.21.3...0.21.4) - 2018-08-21

## [0.21.3](https://github.com/atomist/automation-client-ts/compare/0.21.2...0.21.3) - 2018-08-21

### Added

-   Expose ChildProcess on ChildProcessResult to allow it to be killed. [#342](https://github.com/atomist/automation-client-ts/issues/342)
-   Add support for proxy authentication. [#343](https://github.com/atomist/automation-client-ts/issues/343)

## [0.21.2](https://github.com/atomist/automation-client-ts/compare/0.21.1...0.21.2) - 2018-08-21

### Fixed

-   Get rid of deprecation warnings when installing cli. [#340](https://github.com/atomist/automation-client-ts/issues/340)

## [0.21.1](https://github.com/atomist/automation-client-ts/compare/0.21.0...0.21.1) - 2018-08-18

## [0.21.0](https://github.com/atomist/automation-client-ts/compare/0.20.4...0.21.0) - 2018-08-17

### Changed

-   Install scripts in bin. [#339](https://github.com/atomist/automation-client-ts/issues/339)

## [0.20.4](https://github.com/atomist/automation-client-ts/compare/0.20.3...0.20.4) - 2018-08-17

### Deprecated

-   Move scripts to bin directory. [#338](https://github.com/atomist/automation-client-ts/issues/338)

## [0.20.3](https://github.com/atomist/automation-client-ts/compare/0.20.2...0.20.3) - 2018-08-16

### Changed

-   Use cross-spawn to better support Windows. [#337](https://github.com/atomist/automation-client-ts/issues/337)

## [0.20.2](https://github.com/atomist/automation-client-ts/compare/0.20.1...0.20.2) - 2018-08-16

### Fixed

-   Fix start.gql-gen.ts script for MS Windows.

## [0.20.1](https://github.com/atomist/automation-client-ts/compare/0.20.0...0.20.1) - 2018-08-10

### Added

-   Add git-info and gql-gen scripts. [#1ac65e6](https://github.com/atomist/automation-client-ts/commit/1ac65e68679e63ecf470f57f3014e96abb0630f1)

### Changed

-   Move types to dependencies. [#f9b3331](https://github.com/atomist/automation-client-ts/commit/f9b3331fbc8e53362d535e045a17993a6e3bf178)

## [0.20.0](https://github.com/atomist/automation-client-ts/compare/0.19.7...0.20.0) - 2018-08-09

### Fixed

-   Allow local-sdm "new sdm" command to run from any directory.

## [0.19.7](https://github.com/atomist/automation-client-ts/compare/0.19.6...0.19.7) - 2018-08-09

### Added

-   Add more exports to index.ts

### Changed

-   **BREAKING** Feedback on graphClient.executeQueryFromFile versus graphClient.query. [#334](https://github.com/atomist/automation-client-ts/issues/334)

## [0.19.6](https://github.com/atomist/automation-client-ts/compare/0.19.5...0.19.6) - 2018-08-07

### Changed

-   Update microgrammar dependency.

### Removed

-   Reference to slalom

## [0.19.5](https://github.com/atomist/automation-client-ts/compare/0.19.4...0.19.5) - 2018-08-06

### Fixed

-   Logging initialization when `ATOMIST_DISABLE_LOGGING` is true

## [0.19.4](https://github.com/atomist/automation-client-ts/compare/0.19.3...0.19.4) - 2018-08-02

### Changed

-   Updated schema.

## [0.19.3](https://github.com/atomist/automation-client-ts/compare/0.19.2...0.19.3) - 2018-08-02

### Fixed

-   More workspace/team ID fixes

## [0.19.2](https://github.com/atomist/automation-client-ts/compare/0.19.1...0.19.2) - 2018-08-02

### Changed

-   Configuration workspaceIds will be set to teamIds if no workspaceIds are set.

## [0.19.1](https://github.com/atomist/automation-client-ts/compare/0.19.0...0.19.1) - 2018-08-01

### Fixed

-   Restore start.command.ts.

## [0.19.0](https://github.com/atomist/automation-client-ts/compare/0.18.1...0.19.0) - 2018-07-31

### Added

-   **BREAKING** Initial support for apiKeys. [#329](https://github.com/atomist/automation-client-ts/issues/329)

### Deprecated

-   **BREAKING** Initial support for apiKeys. [#329](https://github.com/atomist/automation-client-ts/issues/329)

## [0.18.1](https://github.com/atomist/automation-client-ts/compare/0.18.0...0.18.1) - 2018-07-31

## [0.18.0](https://github.com/atomist/automation-client-ts/compare/0.17.1...0.18.0) - 2018-07-26

### Added

-   Allow to set timeout on spawned commands. [#312](https://github.com/atomist/automation-client-ts/issues/312)
-   Add command to install kube utilities. [#311](https://github.com/atomist/automation-client-ts/issues/311)
-   HTTP client and factory abstraction. [#321](https://github.com/atomist/automation-client-ts/issues/321)

### Changed

-   Open up configuration. [#320](https://github.com/atomist/automation-client-ts/issues/320)

### Deprecated

-   Migrate atomist CLI to its own package. [#315](https://github.com/atomist/automation-client-ts/issues/315)
-   Replace run.ts with start.command.ts. [#325](https://github.com/atomist/automation-client-ts/issues/325)

### Removed

-   Remove dependency to config module. [#317](https://github.com/atomist/automation-client-ts/issues/317)
-   **BREAKING** `Project` no longer extends `AbstractScriptedFlushable`. This is no longer necessary given async/await. [#318](https://github.com/atomist/automation-client-ts/issues/318)

### Fixed

-   Github's email setting "Block command line pushes that expose my email" breaks `@atomist generate`. [#322](https://github.com/atomist/automation-client-ts/issues/322)

## [0.17.1](https://github.com/atomist/automation-client-ts/compare/0.17.0...0.17.1) - 2018-06-04

### Deprecated

-   Ingester and IngesterBuilder are deprecated in favor of GraphQL SDM definitions.

## [0.17.0](https://github.com/atomist/automation-client-ts/compare/0.16.0...0.17.0) - 2018-06-04

### Fixed

-   Checking out a branch sets the branch. [#293](https://github.com/atomist/automation-client-ts/issues/293)

## [0.16.0](https://github.com/atomist/automation-client-ts/compare/0.15.1...0.16.0) - 2018-05-15

### Added

-   Options for Git push().
-   Token-based authentication.

### Changed

-   Change generator seed repository parameters to include Git provider.

### Deprecated

-   `BitBucketServerRepoRef`.
-   `allReposInTeam()`.
-   `generatorHandler()`.

### Fixed

-   Default @Value handling.

## [0.15.1](https://github.com/atomist/automation-client-ts/compare/0.15.0...0.15.1) - 2018-05-09

### Changed

-   Repo handles both basic and token credentials.
-   Default log file name is now simple client name.

### Fixed

-   Make sure teamIds and groups are set in configuration.
-   Put SDM configuration under "sdm".

## [0.15.0](https://github.com/atomist/automation-client-ts/compare/0.14.1...0.15.0) - 2018-05-07

### Added

-   The config command now probes environment for known SDM variables.

### Changed

-   Reduce default websocket grace period to 10 seconds.
-   Default for `--install` command-line options is to install if the.
-   Support `ATOMIST_config_path` environment variables.
-   Support injection of configuration values.
-   Support arbitrary top-level configuration.
-   **BREAKING** moved `automationClientInstance()` to `globals.ts`.

## [0.14.1](https://github.com/atomist/automation-client-ts/compare/0.14.0...0.14.1) - 2018-04-30

### Added

-   Developer can control banner.

### Changed

-   Upgrade to TypeScript 2.8.3.

## [0.14.0](https://github.com/atomist/automation-client-ts/compare/0.13.1...0.14.0) - 2018-04-27

### Added

-   Provided automation client instance via `automationClientInstance()`.
-   Support for raising PR against any branch.
-   Provider type to RemoteRepoRef.
-   Support for AtomistLog events.

### Changed

-   Print stack trace if loading configuration fails.

### Removed

-   **BREAKING** `runningAutomationClient`, use `automationClientInstance()`.

### Fixed

-   Call listeners on workers in cluster mode.
-   Fix team vs chatTeam usage.
-   Add enums to ingester. [#276](https://github.com/atomist/automation-client-ts/issues/276)

## [0.13.1](https://github.com/atomist/automation-client-ts/compare/0.13.0...0.13.1) - 2018-04-12

### Fixed

-   Fix running node on MS Windows. [#271](https://github.com/atomist/automation-client-ts/issues/271)
-   Ensure gql-fetch works in clients.

## [0.13.0](https://github.com/atomist/automation-client-ts/compare/0.12.1...0.13.0) - 2018-04-10

### Added

-   Production and testing configurations keyed on ATOMIST_ENV or.

### Changed

-   Made more configuration properties optional.
-   Check org webhook before adding repo webhook.

### Fixed

-   statsd reporting in workers.

## [0.12.1](https://github.com/atomist/automation-client-ts/compare/0.12.0...0.12.1) - 2018-04-03

### Fixed

-   Removed removed scripts from package "bin".

## [0.12.0](https://github.com/atomist/automation-client-ts/compare/0.11.2...0.12.0) - 2018-04-03

### Added

-   reduceResults to combine handler results.
-   Functions for posting Atomist webhooks.

### Removed

-   Remove previously deprecated command-line utilities now superseded.

## [0.11.2](https://github.com/atomist/automation-client-ts/compare/0.11.1...0.11.2) - 2018-03-28

### Added

-   ID to ingester messages.

### Changed

-   Clean up logging.

### Fixed

-   Silent `atomist config` crash.

## [0.11.1](https://github.com/atomist/automation-client-ts/compare/0.11.0...0.11.1) - 2018-03-26

### Fixed

-   Do not immediately exit client.

## [0.11.0](https://github.com/atomist/automation-client-ts/compare/0.10.0...0.11.0) - 2018-03-26

### Changed

-   Improved configuration error messages. [#253](https://github.com/atomist/automation-client-ts/issues/253)
-   Provide user configuration if reporting it is valid. [#251](https://github.com/atomist/automation-client-ts/issues/251)
-   Error and exit if any provided configuration is invalid. [#254](https://github.com/atomist/automation-client-ts/issues/254)

## [0.10.0](https://github.com/atomist/automation-client-ts/compare/0.9.0...0.10.0) - 2018-03-26

### Added

-   CLI gql-fetch command to download team schema with custom types.

### Changed

-   Better worker shutdown behavior.
-   Cleaner logs.

## [0.9.0](https://github.com/atomist/automation-client-ts/compare/0.8.0...0.9.0) - 2018-03-21

### Added

-   GraphQL calls use proxy.
-   Startup banner.
-   Log level for logging to file.
-   GitProject revert method.
-   Support for GraphQL fragments.
-   Default gracePeriod of 60s.

### Changed

-   Export combineEditResults.

## [0.8.0](https://github.com/atomist/automation-client-ts/compare/0.7.0...0.8.0) - 2018-03-19

### Added

-   Mapped parameters for all repos.
-   Print banner on successful registration.
-   Branch as optional parameter in RepoRef.
-   statsd support.
-   Logging to file.

### Changed

-   Custom ingester types now use array arguments.
-   At least one user/channel is required when sending messages.
-   Make configuration more composable and user config more powerful.

### Fixed

-   \--version command-line option.

## [0.7.0](https://github.com/atomist/automation-client-ts/compare/0.6.6...0.7.0) - 2018-03-07

### Added

-   Variable parameters in subscriptions.
-   Card support.

### Deprecated

-   config --slack-team command-line option, use --team instead. [#234](https://github.com/atomist/automation-client-ts/issues/234)

## [0.6.6](https://github.com/atomist/automation-client-ts/compare/0.6.5...0.6.6) - 2018-01-31

### Changed

-   Retry HTTP server startup.

### Fixed

-   Make config command-line options optional. [#208](https://github.com/atomist/automation-client-ts/issues/208)
-   Git branch regular expression. [#211](https://github.com/atomist/automation-client-ts/issues/211)
-   Properly shutdown and restart cluster workers.

## [0.6.5](https://github.com/atomist/automation-client-ts/compare/0.6.4...0.6.5) - 2018-01-24

### Changed

-   Make seed repository parameters visible to users.

## [0.6.4](https://github.com/atomist/automation-client-ts/compare/0.6.3...0.6.4) - 2018-01-23

### Changed

-   Updated k8 schema.

### Fixed

-   `setChatUserPreference` mutation.

## [0.6.3](https://github.com/atomist/automation-client-ts/compare/0.6.2...0.6.3) - 2018-01-16

### Added

-   Allow for GHE.

### Fixed

-   Some log statements.

## [0.6.2](https://github.com/atomist/automation-client-ts/compare/0.6.1...0.6.2) - 2018-01-15

### Added

-   Upload files to Slack.

### Changed

-   Migrate from `update_only` to `post_mode` when creating Slack messages.
-   Further decouple GitHub operations from project creation.

## [0.6.1](https://github.com/atomist/automation-client-ts/compare/0.6.0...0.6.1) - 2018-01-12

### Fixed

-   Slack message timestamp and TTL.
-   Connecting via proxy.

## [0.6.0](https://github.com/atomist/automation-client-ts/compare/0.5.2...0.6.0) - 2018-01-11

### Added

-   Basic BitBucket support, thanks @kbristow!.
-   Support for connecting via a proxy.

### Changed

-   Many changes to make more portable, i.e., runnable on MS Windows.
-   Trying to get Git information on a non-git project will now return.
-   Allow GraphQL glob pattern to return no files when generation code.
-   Update to latest GraphQL data model.

## [0.5.2](https://github.com/atomist/automation-client-ts/compare/0.5.0...0.5.2) - 2017-12-04

### Added

-   GitHubUserLogin and AtomistWebhookUrlBase mapped parameter helpers.
-   add support for configurable command handlers.

### Changed

-   remove hard dependency to heapdump; this will make `npm install` easier on Windows.
-   add userId to HandlerContext.
-   Run all tests without GITHUB_TOKEN.
-   Reduce tmp directory retention.

### Fixed

-   keep newlines in commit messages.

## [0.5.0](https://github.com/atomist/automation-client-ts/compare/0.4.0...0.5.0) - 2017-12-07

### Added

-   Optionally add Atomist webhook to create GitHub repo.
-   Generator benchmark tests.
-   Caching metrics.
-   afterAction to generate.

### Changed

-   **Breaking** Removed old class hierarchy for editors, generators.
-   The `AllFiles` glob pattern was simplified to `**`.
-   Move cache directory to ~/.atomist/cache.
-   Generators now cache seed.
-   Several improvements to reviewer interfaces.
-   Scan all commands and events directories for command and event.

### Removed

-   RemoveSeedFiles as it was not generic nor provided much convenience.

### Fixed

-   Issues with deleting files and directories in an InMemoryProject.
-   Ensure GitHub sees a token in a clone URL as a token.

## [0.4.0](https://github.com/atomist/automation-client-ts/compare/0.3.5...0.4.0) - 2017-11-28

### Added

-   Support for parsing and manipulating JavaScript, JSX and TSX via `TypeScriptFileParser`.
-   Support for parsing and manipulating JSON via `jsonUtils` functions.
-   Support for specifying shutdown behavior with `configuration.ws.termination`.

### Changed

-   **Breaking** `editorHandler` now takes a function to create a `ProjectEditor`.

### Removed

-   **Breaking** Removed Spring and Java related generators and.
-   **Breaking** Removed embedded dashboard web ui.

## [0.3.5](https://github.com/atomist/automation-client-ts/compare/0.3.4...0.3.5) - 2017-11-22

### Changed

-   Moved `@types/continuation-local-storage` to dependencies since it.
-   Added more types to default exports in index.ts.

## [0.3.4](https://github.com/atomist/automation-client-ts/compare/0.3.3...0.3.4) - 2017-11-22

### Added

-   `isBinary` method on `File` interface.

### Changed

-   **Breaking** `successfulEdit` function `edited` argument is now required instead of defaulting.
-   `EditResult.edited` is now optional. An undefined value is valid.
-   Moved `@types/graphql` to dependencies since its types are exported.
-   Command parameters now provided as PARAM=VALUE on `exec` command line.

### Fixed

-   Bug where a `SimpleProjectEditor` that did not return an `EditResult`.
-   Add missing team ID to BuildableAutomationServer GraphQL endpoint.

## [0.3.3](https://github.com/atomist/automation-client-ts/compare/0.3.2...0.3.3) - 2017-11-20

### Added

-   Support for nested parameters via initialized object properties on parameters.

### Changed

-   `generate` utility function now takes `RepoId` argument before optional params.
-   Split out tests into test and test-api so non-Atomist developers.
-   Improve `atomist config` handling of existing config file so it.
-   Run `config` and `git` commands in same node process.
-   Added "repo" scope to GitHub personal access token created by config command.
-   @Parameter() will default to empty options, so you don't have to pass {}.

## [0.3.2](https://github.com/atomist/automation-client-ts/compare/0.3.1...0.3.2) - 2017-11-13

### Added

-   Unified `atomist` CLI.

### Changed

-   Improved TypeScript parsing.

### Deprecated

-   atomist-cli, atomist-client, atomist-config, and git-info CLI.

### Fixed

-   Make tests more reliable.

## [0.3.1](https://github.com/atomist/automation-client-ts/compare/0.3.0...0.3.1) - 2017-11-13

### Added

-   Reintroduced exports for backwards compatibility to 0.2.7.

## [0.3.0](https://github.com/atomist/automation-client-ts/compare/0.2.8...0.3.0) - 2017-11-13

### Added

-   Upgraded tree-path library (more support for abbreviated syntax, union path expression support, additional axis specifiers).
-   Support for parsing TypeScript, including path expression support.

### Changed

-   allow `handle` to return `Promise<any>`.
-   enable graphql client-side caching.

### Fixed

-   Fixed #86: Preserved empty directories when caching in memory project. Ability to cache a projcect in memory.
-   Fix #79: Check permissions from seed project. (#83)

## [0.2.8](https://github.com/atomist/automation-client-ts/compare/0.2.5...0.2.7) - 2017-11-07

## [0.2.7](https://github.com/atomist/automation-client-ts/compare/0.2.5...0.2.8) - 2017-11-07

## [0.2.5](https://github.com/atomist/automation-client-ts/compare/0.2.4...0.2.5) - 2017-10-26

### Fixed

-   Much closer to backward compatible with 0.2.3 project operations than 0.2.4.

## [0.2.4](https://github.com/atomist/automation-client-ts/compare/0.2.3...0.2.4) - 2017-10-26

### Changed

-   Project copying no longer blocks.
-   Update package dependencies and scripts for portability.
-   Git provider is now pluggable.

### Fixed

-   Various generator issues.
-   Handler metadata inheritance.

## [0.2.3](https://github.com/atomist/automation-client-ts/compare/0.2.2...0.2.3) - 2017-10-24

### Changed

-   Generator and editor refactoring.
-   Update command page.

## [0.2.2](https://github.com/atomist/automation-client-ts/compare/0.2.1...0.2.2) - 2017-10-24

### Added

-   Administrative endpoints for health, info, etc.

### Changed

-   Pulled up ProjectOperationCredentials and DirectoryManager.

### Fixed

-   Create client config in proper directory on win32. [#44](https://github.com/atomist/automation-client-ts/issues/44),

## [0.2.1](https://github.com/atomist/automation-client-ts/compare/0.2.0...0.2.1) - 2017-10-23

### Added

-   Allow `CommandHandler` instances to be created from functions.
-   Allow a class to be passed into a command handler list, as well as.
-   Add channel mutations.

### Changed

-   Improved reconnect handling.

### Fixed

-   RepoId included in InMemory project. [#33](https://github.com/atomist/automation-client-ts/issues/33)
-   Can continue after failed attempt to load a repo. [#30](https://github.com/atomist/automation-client-ts/issues/30)
-   Updated docs after removal of RunOrDefer. [#24](https://github.com/atomist/automation-client-ts/issues/24)
-   Documentation for editors and generators. [#32](https://github.com/atomist/automation-client-ts/issues/32)

## [0.2.0](https://github.com/atomist/automation-client-ts/compare/0.1.50...0.2.0) - 2017-10-18

### Changed

-   Make atomist-setup script quieter and more robust.
-   Align generators with ProjectEditor.

## [0.1.50](https://github.com/atomist/automation-client-ts/compare/0.1.49...0.1.50) - 2017-10-19

### Added

-   RepoId to Project.

### Changed

-   More currying.
-   Overhauled edit and review models.

### Fixed

-   Issue with SpringBootSeed.

## [0.1.49](https://github.com/atomist/automation-client-ts/compare/0.1.48...0.1.49) - 2017-10-18

### Changed

-   Moved moveFile from AbstractProject to Project.
-   Exec npm start in atomist-setup script.

## [0.1.48](https://github.com/atomist/automation-client-ts/compare/0.1.47...0.1.48) - 2017-10-18

### Changed

-   Spring and Java inference improvements.

## [0.1.47](https://github.com/atomist/automation-client-ts/compare/0.1.46...0.1.47) - 2017-10-18

### Changed

-   Update tree-path dependency.

## [0.1.46](https://github.com/atomist/automation-client-ts/compare/0.1.44...0.1.46) - 2017-10-18

### Added

-   Scripts to setup and configure Atomist API client.

### Changed

-   The client will look for config under ~/.atomist/client.config.json.
-   Handlers can be called via instance or class name in addition to.
-   Improve error messages.
-   Various project operation improvements.

## [0.1.44](https://github.com/atomist/automation-client-ts/compare/0.1.43...0.1.44) - 2017-10-16

### Added

-   Publish master and PR builds as pre-release versions to Atomist.

### Changed

-   Updated @atomist/microgrammar to 0.7.0.
-   Cleaned up dependencies.
-   Dashboard improvements.

## [0.1.43](https://github.com/atomist/automation-client-ts/compare/0.1.42...0.1.43) - 2017-10-11

### Added

-   Mutation support in GraphQL.

### Changed

-   GraphClient executeFile is now executeQueryFromFile.

### Removed

-   Tree and path expression support moved to own module.

## [0.1.37](https://github.com/atomist/automation-client-ts/compare/0.1.36...0.1.37) - 2017-10-02

### Added

-   File replace and replaceAll.

## [0.1.0](https://github.com/atomist/automation-client-ts/tree/0.1.0) - 2017-09-19

### Added

-   Totally revamped command and event handler model.
-   Added new `@Ingestor` automation type.
-   Switched to GraphQL for querying data.
