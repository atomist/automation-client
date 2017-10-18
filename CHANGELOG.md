# Change Log

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/)
and this project adheres to [Semantic Versioning](http://semver.org/).

## [Unreleased][]

[Unreleased]: https://github.com/atomist/automation-client-ts/compare/0.1.46...HEAD

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
