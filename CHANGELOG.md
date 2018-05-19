# Change Log

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/)
and this project adheres to [Semantic Versioning](http://semver.org/).

## [Unreleased][]

[Unreleased]: https://github.com/atomist/automation-client-ts/compare/0.16.0...HEAD

## [0.16.0][] - 2018-05-15

[0.16.0]: https://github.com/atomist/automation-client-ts/compare/0.15.1...0.16.0

Provider release

### Changed

-   Change generator seed repository parameters to include Git provider

### Fixed

-   Default @Value handling

### Added

-   Options for Git push()
-   Token-based authentication

### Deprecated

-   `BitBucketServerRepoRef`
-   `allReposInTeam()`
-   `generatorHandler()`

## [0.15.1][] - 2018-05-09

[0.15.1]: https://github.com/atomist/automation-client-ts/compare/0.15.0...0.15.1

CfgFix release

### Changed

-   Repo handles both basic and token credentials
-   Default log file name is now simple client name

### Fixed

-   Make sure teamIds and groups are set in configuration
-   Put SDM configuration under "sdm"

## [0.15.0][] - 2018-05-07

[0.15.0]: https://github.com/atomist/automation-client-ts/compare/0.14.1...0.15.0

Multi release

### Changed

-   Reduce default websocket grace period to 10 seconds
-   Default for `--install` command-line options is to install if the
    node_modules directory does not exist
-   Support `ATOMIST_config_path` environment variables
-   Support injection of configuration values
-   Support arbitrary top-level configuration
-   **BREAKING** moved `automationClientInstance()` to `globals.ts`

### Added

-   The config command now probes environment for known SDM variables
    and persists them to the user configuration

## [0.14.1][] - 2018-04-30

[0.14.1]: https://github.com/atomist/automation-client-ts/compare/0.14.0...0.14.1

Banner release

### Added

-   Developer can control banner

### Changed

-   Upgrade to TypeScript 2.8.3

## [0.14.0][] - 2018-04-27

[0.14.0]: https://github.com/atomist/automation-client-ts/compare/0.13.1...0.14.0

Client release

### Fixed

-   Call listeners on workers in cluster mode
-   Fix team vs chatTeam usage
-   Add enums to ingester [#276][276]

### Added

-   Provided automation client instance via `automationClientInstance()`
-   Support for raising PR against any branch
-   Provider type to RemoteRepoRef
-   Support for AtomistLog events

### Changed

-   Print stack trace if loading configuration fails

### Removed

-   **BREAKING** `runningAutomationClient`, use `automationClientInstance()`

[276]: https://github.com/atomist/automation-client-ts/issues/276

## [0.13.1][] - 2018-04-12

[0.13.1]: https://github.com/atomist/automation-client-ts/compare/0.13.0...0.13.1

Win release

### Fixed

-   Fix running node on MS Windows [#271][271]
-   Ensure gql-fetch works in clients

[271]: https://github.com/atomist/automation-client-ts/issues/271

## [0.13.0][] - 2018-04-10

[0.13.0]: https://github.com/atomist/automation-client-ts/compare/0.12.1...0.13.0

Config release

### Added

-   Production and testing configurations keyed on ATOMIST_ENV or
    NODE_ENV

### Changed

-   Made more configuration properties optional
-   Check org webhook before adding repo webhook

### Fixed

-   statsd reporting in workers

## [0.12.1][] - 2018-04-03

[0.12.1]: https://github.com/atomist/automation-client-ts/compare/0.12.0...0.12.1

bin release

### Fixed

-   Removed removed scripts from package "bin"

## [0.12.0][] - 2018-04-03

[0.12.0]: https://github.com/atomist/automation-client-ts/compare/0.11.2...0.12.0

Helper release

### Added

-   reduceResults to combine handler results
-   Functions for posting Atomist webhooks

### Removed

-   Remove previously deprecated command-line utilities now superseded
    by the combined `atomist` CLI

## [0.11.2][] - 2018-03-28

[0.11.2]: https://github.com/atomist/automation-client-ts/compare/0.11.1...0.11.2

ID release

### Changed

-   Clean up logging

### Added

-   ID to ingester messages

### Fixed

-   Silent `atomist config` crash

## [0.11.1][] - 2018-03-26

[0.11.1]: https://github.com/atomist/automation-client-ts/compare/0.11.0...0.11.1

Run release

### Fixed

-   Do not immediately exit client

## [0.11.0][] - 2018-03-26

[0.11.0]: https://github.com/atomist/automation-client-ts/compare/0.10.0...0.11.0

Usability release

### Changed

-   Improved configuration error messages [#253][253]
-   Provide user configuration if reporting it is valid [#251][251]
-   Error and exit if any provided configuration is invalid [#254][254]

[253]: https://github.com/atomist/automation-client-ts/issues/253
[251]: https://github.com/atomist/automation-client-ts/issues/251
[254]: https://github.com/atomist/automation-client-ts/issues/254

## [0.10.0][] - 2018-03-26

[0.10.0]: https://github.com/atomist/automation-client-ts/compare/0.9.0...0.10.0

Schema release

### Added

-   CLI gql-fetch command to download team schema with custom types

### Changed

-   Better worker shutdown behavior
-   Cleaner logs

## [0.9.0][] - 2018-03-21

[0.9.0]: https://github.com/atomist/automation-client-ts/compare/0.8.0...0.9.0

Fragment release

### Added

-   GraphQL calls use proxy
-   Startup banner
-   Log level for logging to file
-   GitProject revert method
-   Support for GraphQL fragments
-   Default gracePeriod of 60 s

### Changed

-   Export combineEditResults

## [0.8.0][] - 2018-03-19

[0.8.0]: https://github.com/atomist/automation-client-ts/compare/0.7.0...0.8.0

Configuration release

### Changed

-   Custom ingester types now use array arguments
-   At least one user/channel is required when sending messages
-   Make configuration more composable and user config more powerful

### Fixed

-   --version command-line option

### Added

-   Mapped parameters for all repos
-   Print banner on successful registration
-   Branch as optional parameter in RepoRef
-   statsd support
-   Logging to file

## [0.7.0][] - 2018-03-07

[0.7.0]: https://github.com/atomist/automation-client-ts/compare/0.6.6...0.7.0

Card release

### Added

-   Variable parameters in subscriptions
-   Card support

### Deprecated

-   config --slack-team command-line option, use --team instead [#234][234]

[234]: https://github.com/atomist/automation-client-ts/issues/234

## [0.6.6][] - 2018-01-31

[0.6.6]: https://github.com/atomist/automation-client-ts/compare/0.6.5...0.6.6

Command release

### Changed

-   Retry HTTP server startup

### Fixed

-   Make config command-line options optional [#208][208]
-   Git branch regular expression [#211][211]
-   Properly shutdown and restart cluster workers

[208]: https://github.com/atomist/automation-client-ts/issues/208
[211]: https://github.com/atomist/automation-client-ts/issues/211

## [0.6.5][] - 2018-01-24

[0.6.5]: https://github.com/atomist/automation-client-ts/compare/0.6.4...0.6.5

Seed release

### Changed

-   Make seed repository parameters visible to users

## [0.6.4][] - 2018-01-23

[0.6.4]: https://github.com/atomist/automation-client-ts/compare/0.6.3...0.6.4

Kubernetes release

### Changed

-   Updated k8 schema

### Fixed

-   `setChatUserPreference` mutation

## [0.6.3][] - 2018-01-16

[0.6.3]: https://github.com/atomist/automation-client-ts/compare/0.6.2...0.6.3

Enterprise release

### Added

-   Allow for GHE

### Fixed

-   Some log statements

## [0.6.2][] - 2018-01-15

[0.6.2]: https://github.com/atomist/automation-client-ts/compare/0.6.1...0.6.2

Conscious uncoupling release

### Added

-   Upload files to Slack

### Changed

-   Migrate from `update_only` to `post_mode` when creating Slack messages
-   Further decouple GitHub operations from project creation

## [0.6.1][] - 2018-01-12

[0.6.1]: https://github.com/atomist/automation-client-ts/compare/0.6.0...0.6.1

Eproxy release

### Fixed

-   Slack message timestamp and TTL
-   Connecting via proxy

## [0.6.0][] - 2018-01-11

[0.6.0]: https://github.com/atomist/automation-client-ts/compare/0.5.2...0.6.0

Proxy release

### Changed

-   Many changes to make more portable, i.e., runnable on MS Windows
-   Trying to get Git information on a non-git project will now return
    empty values instead of failing [#131][131]
-   Allow GraphQL glob pattern to return no files when generation code
    from GraphQL [#130][130]
-   Update to latest GraphQL data model

### Added

-   Basic BitBucket support, thanks @kbristow!
-   Support for connecting via a proxy

[131]: https://github.com/atomist/automation-client-ts/issues/131
[130]: https://github.com/atomist/automation-client-ts/issues/130

## [0.5.2][] - 2017-12-04

[0.5.2]: https://github.com/atomist/automation-client-ts/compare/0.5.0...0.5.2

### Added

-   GitHubUserLogin and AtomistWebhookUrlBase mapped parameter helpers
-   add support for configurable command handlers

### Changed

-   remove hard dependency to heapdump; this will make `npm install` easier on Windows
-   add userId to HandlerContext
-   Run all tests without GITHUB_TOKEN
-   Reduce tmp directory retention

### Fixed

-   keep newlines in commit messages

## [0.5.0][] - 2017-12-07

[0.5.0]: https://github.com/atomist/automation-client-ts/compare/0.4.0...0.5.0

### Changed

-   **Breaking** Removed old class hierarchy for editors, generators
    and reviewers (`AbstractGenerator/UniversalSeed`, etc), use new
    functional style as in [spring-automation][]
-   The `AllFiles` glob pattern was simplified to `**`
-   Move cache directory to ~/.atomist/cache
-   Generators now cache seed
-   Several improvements to reviewer interfaces
-   Scan all commands and events directories for command and event
    handlers, respectively

### Fixed

-   Issues with deleting files and directories in an InMemoryProject
-   Ensure GitHub sees a token in a clone URL as a token

### Removed

-   RemoveSeedFiles as it was not generic nor provided much convenience

### Added

-   Optionally add Atomist webhook to create GitHub repo
-   Generator benchmark tests
-   Caching metrics
-   afterAction to generate

[spring-automation]: https://github.com/atomist/spring-automation (@atomist/spring-automation)

## [0.4.0][] - 2017-11-28

[0.4.0]: https://github.com/atomist/automation-client-ts/compare/0.3.5...0.4.0

Less is more release

### Added

-   Support for parsing and manipulating JavaScript, JSX and TSX via `TypeScriptFileParser`
-   Support for parsing and manipulating JSON via `jsonUtils` functions
-   Support for specifying shutdown behavior with `configuration.ws.termination`

### Changed

-   **Breaking** `editorHandler` now takes a function to create a `ProjectEditor`

### Removed

-   **Breaking** Removed Spring and Java related generators and
    support, which belong in a language-specific module.  Now in
    `atomist/spring-automation`
-   **Breaking** Removed embedded dashboard web ui

## [0.3.5][] - 2017-11-22

[0.3.5]: https://github.com/atomist/automation-client-ts/compare/0.3.4...0.3.5

### Changed

-   Moved `@types/continuation-local-storage` to dependencies since it
    has exported types
-   Added more types to default exports in index.ts

## [0.3.4][] - 2017-11-22

[0.3.4]: https://github.com/atomist/automation-client-ts/compare/0.3.3...0.3.4

Edit release

### Added

-   `isBinary` method on `File` interface

### Changed

-   **Breaking** `successfulEdit` function `edited` argument is now required instead of defaulting
    to true
-   `EditResult.edited` is now optional. An undefined value is valid and means that the
    editor didn't keep track of whether it made changes. This is the norm for simple functions
    taking `Project`.
-   Moved `@types/graphql` to dependencies since its types are exported
-   Command parameters now provided as PARAM=VALUE on `exec` command line

### Fixed

-   Bug where a `SimpleProjectEditor` that did not return an `EditResult` and made
    no changes would fail due to unsuccessful git commit
-   Add missing team ID to BuildableAutomationServer GraphQL endpoint

## [0.3.3][] - 2017-11-20

[0.3.3]: https://github.com/atomist/automation-client-ts/compare/0.3.2...0.3.3

Scope release

### Added

-   Support for nested parameters via initialized object properties on parameters

### Changed

-   `generate` utility function now takes `RepoId` argument before optional params
-   Split out tests into test and test-api so non-Atomist developers
    can run non-API tests
-   Improve `atomist config` handling of existing config file so it
    can be used to add additional teams
-   Run `config` and `git` commands in same node process
-   Added "repo" scope to GitHub personal access token created by
    `config` since so many sample automations require it
-   @Parameter() will default to empty options, so you don't have to pass {}

## [0.3.2][] - 2017-11-13

[0.3.2]: https://github.com/atomist/automation-client-ts/compare/0.3.1...0.3.2

Unification release

### Added

-   Unified `atomist` CLI

### Deprecated

-   atomist-cli, atomist-client, atomist-config, and git-info CLI
    utilities

### Changed

-   Improved TypeScript parsing

### Fixed

-   Make tests more reliable

## [0.3.1][] - 2017-11-13

[0.3.1]: https://github.com/atomist/automation-client-ts/compare/0.3.0...0.3.1

### Added

*   Reintroduced exports for backwards compatibility to 0.2.7

## [0.3.0][] - 2017-11-13

[0.3.0]: https://github.com/atomist/automation-client-ts/compare/0.2.8...0.3.0

### Added

*   Upgraded tree-path library (more support for abbreviated syntax, union path expression support, additional axis specifiers)
*   Support for parsing TypeScript, including path expression support

### Changed

*   allow `handle` to return `Promise<any>`
*   enable graphql client-side caching

### Fixed

*   Fixed #86: Preserved empty directories when caching in memory project. Ability to cache a projcect in memory
*   Fix #79: Check permissions from seed project (#83)

## [0.2.8][] - 2017-11-07

[0.2.8]: https://github.com/atomist/automation-client-ts/compare/0.2.5...0.2.7

-   export commonly used things from root

## [0.2.7][] - 2017-11-07

[0.2.7]: https://github.com/atomist/automation-client-ts/compare/0.2.5...0.2.8

-   Fix TypeDoc generation
-   Convenience to edit exactly one repo
-   ability to make a file executable
-   ts defaults to Date.now()
-   switch intent on CommandHandler decorator to vararg
-   add test app events
-   add support for protecting command handlers
-   Secret.userToken now takes string[] or string
-   More functional approach to generation flow
-   merge parameters from an instance
-   Added FreeChoices value for parameter types to take arbitrary string arrays
-   support redirect from handler invocations
-   Added array parameters (#61)
-   add RequestHandlers to express customizer
-   Add ability to customize Express server instance
-   allow graphql files to be loaded with relative paths
-   update cortex schema
-   retry generator pushes after repo creation


## [0.2.5][] - 2017-10-26

[0.2.5]: https://github.com/atomist/automation-client-ts/compare/0.2.4...0.2.5

Backward compatibility release

### Fixed

-   Much closer to backward compatible with 0.2.3 project operations than 0.2.4.

## [0.2.4][] - 2017-10-26

[0.2.4]: https://github.com/atomist/automation-client-ts/compare/0.2.3...0.2.4

Git provider pluggability release

### Changed

-   Project copying no longer blocks
-   Update package dependencies and scripts for portability
-   Git provider is now pluggable

### Fixed

-   Various generator issues
-   Handler metadata inheritance

## [0.2.3][] - 2017-10-24

[0.2.3]: https://github.com/atomist/automation-client-ts/compare/0.2.2...0.2.3

Refactoring release

### Changed

-   Generator and editor refactoring
-   Update command page

## [0.2.2][] - 2017-10-24

[0.2.2]: https://github.com/atomist/automation-client-ts/compare/0.2.1...0.2.2

Administrative release

### Added

-   Administrative endpoints for health, info, etc.

### Changed

-   Pulled up ProjectOperationCredentials and DirectoryManager
    interfaces

### Fixed

-   Create client config in proper directory on win32 [#44][44],
    thanks to [jwalter][]

[44]: https://github.com/atomist/automation-client-ts/issues/44
[jwalter]: https://github.com/jwalter

## [0.2.1][] - 2017-10-23

[0.2.1]: https://github.com/atomist/automation-client-ts/compare/0.2.0...0.2.1

Functional invocation release

### Added

-   Allow `CommandHandler` instances to be created from functions
-   Allow a class to be passed into a command handler list, as well as
    `() => handler` function
-   Add channel mutations

### Changed

-   Improved reconnect handling

### Fixed

-   RepoId included in InMemory project [#33][33]
-   Can continue after failed attempt to load a repo [#30][30]
-   Updated docs after removal of RunOrDefer [#24][24]
-   Documentation for editors and generators [#32][32]

[33]: https://github.com/atomist/automation-client-ts/issues/33
[30]: https://github.com/atomist/automation-client-ts/issues/30
[24]: https://github.com/atomist/automation-client-ts/issues/24
[32]: https://github.com/atomist/automation-client-ts/issues/32

## [0.2.0][] - 2017-10-18

[0.2.0]: https://github.com/atomist/automation-client-ts/compare/0.1.50...0.2.0

Alignment Release

### Changed

-   Make atomist-setup script quieter and more robust
-   Align generators with ProjectEditor

## [0.1.50][] - 2017-10-19

[0.1.50]: https://github.com/atomist/automation-client-ts/compare/0.1.49...0.1.50

Curry Release

### Changed

-   More currying
-   Overhauled edit and review models

### Added

-   RepoId to Project

### Fixed

-   Issue with SpringBootSeed

## [0.1.49][] - 2017-10-18

[0.1.49]: https://github.com/atomist/automation-client-ts/compare/0.1.48...0.1.49

Move Release

### Changed

-   Moved moveFile from AbstractProject to Project
-   Exec npm start in atomist-setup script

## [0.1.48][] - 2017-10-18

[0.1.48]: https://github.com/atomist/automation-client-ts/compare/0.1.47...0.1.48

Spring Release

### Changed

-   Spring and Java inference improvements

## [0.1.47][] - 2017-10-18

[0.1.47]: https://github.com/atomist/automation-client-ts/compare/0.1.46...0.1.47

Tree Release

### Changed

-   Update tree-path dependency

## [0.1.46][] - 2017-10-18

[0.1.46]: https://github.com/atomist/automation-client-ts/compare/0.1.44...0.1.46

Config Release

### Changed

-   The client will look for config under ~/.atomist/client.config.json
-   Handlers can be called via instance or class name in addition to
    name string
-   Improve error messages
-   Various project operation improvements

### Added

-   Scripts to setup and configure Atomist API client

## [0.1.44][] - 2017-10-16

[0.1.44]: https://github.com/atomist/automation-client-ts/compare/0.1.43...0.1.44

Pre Release

### Changed

-   Updated @atomist/microgrammar to 0.7.0
-   Cleaned up dependencies
-   Dashboard improvements

### Added

-   Publish master and PR builds as pre-release versions to Atomist
    NPM registry

## [0.1.43][] - 2017-10-11

[0.1.43]: https://github.com/atomist/automation-client-ts/compare/0.1.42...0.1.43

Light Release

### Changed

-  GraphClient executeFile is now executeQueryFromFile

### Added

-   Mutation support in GraphQL

### Removed

-   Tree and path expression support moved to own module

## [0.1.37][] - 2017-10-02

File Release

[0.1.37]: https://github.com/atomist/automation-client-ts/compare/0.1.36...0.1.37

### Added

-   File replace and replaceAll

## [0.1.0][] - 2017-09-19

Initial Release

[0.1.0]: https://github.com/atomist/automation-client-ts/tree/0.1.0

### Added

-   Totally revamped command and event handler model
-   Added new `@Ingestor` automation type
-   Switched to GraphQL for querying data
