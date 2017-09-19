# @atomist/automation-client

[![Build Status](https://travis-ci.org/atomist/automation-client-ts.svg?branch=master)](https://travis-ci.org/atomist/automation-client-ts)

[Node][node] module [`@atomist/automation-client`][automation-client] for creating command and event handlers
using the standalone server.

[node]: https://nodejs.org/en/
[automation-client]: https://www.npmjs.com/package/@atomist/automation-client

# Getting Started

## Prerequisites

### Node.js

Please install Node.js from https://nodejs.org/en/download/ .

To verify that the right versions are installed, please run:

```
$ node -v
v8.4.0
$ npm -v
5.4.1
```

## Using the `automation-client` module from your project

To start using this module in your Node.js application, you have to add a dependency to it to your `package.json`
by running the following command:

```
$ npm install @atomist/automation-client --save
```

You can find reference documentation at https://atomist.github.io/automation-client-ts/ .

# Implementing Automations

## Command Handlers

Commands are automations that can be invoked via a Chat bot, curl or web interface.

To create a command take a look at the following example:

```javascript
import { CommandHandler, Parameter} from "@atomist/rug/operations/Decorators";
import { HandleCommand, HandlerContext, HandlerResult } from "@atomist/automation-node/rug/operations/Handlers";

@CommandHandler("HelloWorld", "Sends a hello back to the client", "hello world")
export class HelloWorld implements HandleCommand {

    @Parameter({pattern: "^.*$", required: true})
    public name: string;

    public handle(ctx: HandlerContext): Promise<HandlerResult> {

        return ctx.messageClient.respond(`Hello world, ${this.name}`)
            .then(() => {
                return Promise.resolve({code: 0});
            });
    }
}

```

The above declares a simple bot command that can be invoked via `@atomist hello world`. The command takes one
parameter called `name`. The handler will respond with a simple greeting message.

## Event Handlers

Event handlers are automations that allow handling of events based on registered GraphQL subscriptions.

To create a event handler take a look at the following example:

```javascript
import { EventFired, EventHandler, HandleEvent, HandlerContext, HandlerResult }
    from "@atomist/automation-node/rug/operations/Handlers";

@EventHandler("HelloIssue", "Notify channel on new issue", `subscription HelloIssue{
    Issue {
      number
      title
      repo {
        channels {
          name
        }
      }
     }
}`)
export class HelloIssue implements HandleEvent<any> {

    public handle(e: EventFired<any>, ctx: HandlerContext): Promise<HandlerResult> {

        return Promise.all(e.data.Issue.map(i =>
            ctx.messageClient.addressChannels(`Got a new issue  \`${i.number}# ${i.title}\``,
                i.repo.channels.map(c => c.name ))))
            .then(() => {
                return Promise.resolve({code: 0});
            });
    }
}

```

This event handler registers a GraphQL subscription on the `Issue` type. On `Issue` events the handler will
send a simple message back to the associated slack team.

## Register Handlers

In order to register your handlers with the Automation node, please create a file `atomist.config.ts` and put
the following contents in:

```javascript
import { Configuration } from "@atomist/automation-node/configuration";

import { HelloWorld } from "./commands/HelloWorld";
import { HelloIssue } from "./events/HelloIssue";

export const configuration: Configuration = {
    name: "your_module_name",
    version: "0.0.1",
    teamId: "T1L0VDKJP",
    commands: [
        () => new HelloWorld(),
    ],
    events: [
        () => new HelloIssue(),
    ],
    token: "<your github token with read:org scope>",
};
```

This file allows you to register your handlers as well as to specify name and version for your automation server.

# Running the Automation node

There are several ways you can run your automation node and have it connect to Atomist servers.

## Run Locally

To start up the node locally and have it listen to incoming events, just run:

```
$ npm run compile && $(npm bin)/atomist-client

```

## Push to Cloud Foundry

To prepare for your automation server to run on any Cloud Foundry
instance, please make sure that you have an account on an instance of
Cloud Foundry and that you have the Cloud Foundry CLI installed,
configured and logged in.

First you need to create a `manifest.yml` in the root of your node
project. Put the following minimum content into the file:

```

applications:
- name: YOUR_APP_NAME
  command: $(npm bin)/atomist-node
  memory: 512M
  buildpack: https://github.com/cloudfoundry/nodejs-buildpack
  env:
    GITHUB_TOKEN: YOUR_GITHUB_TOKEN
```

Next please add an `"engines"` top-level entry to your `package.json`
like the following:

```javascript
  "engines": {
    "node": "8.2.x",
    "npm": "5.3.x"
  }
```

Now you're ready to `cf push` your automation server to Cloud Foundry:

```
$ cf push

```

## Support

General support questions should be discussed in the `#support`
channel on our community Slack team
at [atomist-community.slack.com][slack].

If you find a problem, please create an [issue][].

[issue]: https://github.com/atomist/automation-client-ts/issues

## Development

You will need to install [node][] to build and test this project.

### Build and Test

Command | Reason
------- | ------
`npm install` | to install all the required packages
`npm run lint` | to run tslint against the TypeScript
`npm run compile` | to compile all TypeScript into JavaScript
`npm test` | to run tests and ensure everything is working
`npm run autotest` | run tests continuously (you may also need to run `tsc -w`)
`npm run clean` | remove stray compiled JavaScript files and build directory

### Release

To create a new release of the project, simply push a tag of the form
`M.N.P` where `M`, `N`, and `P` are integers that form the next
appropriate [semantic version][semver] for release.  The version in
the package.json is replaced by the build and is totally ignored!  For
example:

[semver]: http://semver.org

```
$ git tag -a 1.2.3
$ git push --tags
```

The Travis CI build (see badge at the top of this page) will publish
the NPM module and automatically create a GitHub release using the tag
name for the release and the comment provided on the annotated tag as
the contents of the release notes.

---
Created by [Atomist][atomist].
Need Help?  [Join our Slack team][slack].

[atomist]: https://www.atomist.com/
[slack]: https://join.atomist.com
