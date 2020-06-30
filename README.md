# @atomist/automation-client

This package contains the low-level API client for the Atomist service
underpinning the Atomist Software Delivery Machine (SDM) framework.
Please see the [`@atomist/sdm`][sdm] package for information on how to
develop SDMs.

[sdm]: https://github.com/atomist/sdm

## Support

General support questions should be discussed in the `#support`
channel on our community Slack team
at [atomist-community.slack.com][slack].

If you find a problem, please create an [issue][].

[issue]: https://github.com/atomist/automation-client-ts/issues

## Development

You will need to install [node][] to build and test this project.
First install the package dependencies.

```
$ npm ci
```

To run tests, define a GITHUB_TOKEN to any valid token that has repo access. The tests
will create and delete repositories.

Define GITHUB_VISIBILITY=public if you want these to be public; default is private.
You'll get a 422 response from repo creation if you don't pay for private repos.

```
$ npm run build
```

[node]: https://nodejs.org/ (Node.js)

### Release

To create a new release of the project, we push a button on the Atomist lifecycle message
in the #automation-client-ts [channel](https://atomist-community.slack.com/messages/C74J6MFL0/) in Atomist Community Slack.

---

Created by [Atomist][atomist].
Need Help?  [Join our Slack team][slack].

[atomist]: https://atomist.com/ (Atomist - Development Automation)
[slack]: https://join.atomist.com/ (Atomist Community Slack)
