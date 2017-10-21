# Change Log

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/)
and this project adheres to [Semantic Versioning](http://semver.org/).

## [Unreleased][]

[Unreleased]: https://github.com/atomist/automation-client-ts/compare/0.2.0...HEAD

Functional invocation release

### Added

-   Allow `CommandHandler` instances to be created from functions
-   Allow a class to be passed into a command handler list, as well as `() => handler`
function

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
