# Change Log

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/)
and this project adheres to [Semantic Versioning](http://semver.org/).

## [Unreleased][]

[Unreleased]: https://github.com/atomist/automation-client-ts/compare/0.3.5...HEAD

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
