# @atomist/automation-client

[![Build Status](https://travis-ci.org/atomist/automation-client-ts.svg?branch=master)](https://travis-ci.org/atomist/automation-client-ts)

[Node][node] module [`@atomist/automation-client`][automation-client]
for creating Atomist development automations.  Development automations take the following forms:

-   Bot commands - create bot commands using _command handlers_
-   Respond to events - use _event handlers_ to automatically
    take action when events, like someone commenting on an issue,
    happen
-   Ingestors - define your own, custom events that you can then take
    action on

The automation-client provide the ability to run a client that
connects to the Atomist API so it can receive and act on commands and
events.

[node]: https://nodejs.org/ (Node.js)
[automation-client]: https://www.npmjs.com/package/@atomist/automation-client

## Concepts

Atomist is a service and API that enables development automation. The
Atomist service builds and maintains a model of the things that matter
to your development team. You can then use out of the box automations
or build your own automations acting on this model.

For more information, please read [Concepts](docs/Concepts.md).

## Getting Started

Please install [Node.js][node].  To verify that the right versions are
installed, please run:

```
$ node -v
v8.4.0
$ npm -v
5.4.1
```

### Using the `automation-client` module from your project

To start using this module in your Node.js application, you have to add a dependency to it to your `package.json`
by running the following command:

```
$ npm install @atomist/automation-client --save
```

You can find reference documentation at https://atomist.github.io/automation-client-ts/ .

### Starting from a Sample

We also provide a working project with some basic automations that you can use to get started quickly. The repository
is at [atomist/automation-seed-ts](https://github.com/atomist/automation-seed-ts).

To get started run the following commands:

```
$ git clone git@github.com:atomist/automation-seed-ts.git
$ cd automation-seed-ts
$ npm install
```

See the [automation-seed-ts README][seed-readme] for further
instructions.

[seed-readme]: https://github.com/atomist/automation-seed-ts#readme

## Implementing Automations

### Command Handlers

Commands are automations that can be invoked via a Chat bot, curl or web interface.

To create a command take a look at the following example:

```typescript
import { CommandHandler, Parameter} from "@atomist/automation-client/decorators";
import { HandleCommand, HandlerContext, HandlerResult } from "@atomist/automation-client/Handlers";

@CommandHandler("Sends a hello back to the client", "hello world")
//                                                   ^ -- defines the command to trigger
//                      "                                 this handler from the bot
export class HelloWorld implements HandleCommand {
//                                 ^ -- a command handler implements the HandleCommand
//                                      interface

    @Parameter({ pattern: /^.*$/, required: true })
//  ^            ^                ^ -- parameters can be marked required or optional
//  ^            ^ -- the parameter can be validated against a RegExp pattern
//  ^ -- this defines a user-provided parameter named 'name'
    public name: string;


    public handle(ctx: HandlerContext): Promise<HandlerResult> {
//  ^             ^ -- HandlerContext provides access to a 'MessageClient' for sending
//  ^                  messages to the bot as well as a 'GraphClient' to query your
//  ^                  data using GraphQL
//  ^ -- this method is the body of the handler and where the actual code goes
        return ctx.messageClient.respond(`Hello ${this.name}`)
//                               ^ -- Calling 'respond' on the 'MessageClient' will
//                                    send a message back to wherever that command
//                                    is invoked from (eg. a DM with @atomist in Slack)
            .then(() => {
                return Promise.resolve({ code: 0 });
//                                     ^ -- Command handlers are expected to return a
//                                          'Promise' of type 'HandlerResult' which
//                                          just defines a return code. Nonzero
//                                          return codes indicate errors.
            });
    }
}
```

The above declares a simple bot command that can be invoked via `@atomist hello world`. The command takes one
parameter called `name`. The handler will respond with a simple greeting message.

For more information, please see [Command Handlers](docs/CommandHandlers.md).

### Event Handlers

Event handlers are automations that allow handling of events based on registered GraphQL subscriptions.

To create a event handler take a look at the following example:

```typescript
import { EventFired, EventHandler, HandleEvent, HandlerContext, HandlerResult }
    from "@atomist/automation-client/Handlers";

@EventHandler("Notify channel on new issue", `subscription HelloIssue {
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
//                                            ^ -- This is GraphQL subscription you want
//                                                 to match to trigger your handler.
//                                                 Queries can also be externalized.
export class HelloIssue implements HandleEvent<any> {
//                                 ^ -- an event handler implements the 'HandleEvent'
//                                      interface

    public handle(e: EventFired<any>, ctx: HandlerContext): Promise<HandlerResult> {
//                ^                   ^ -- 'HandlerContext' gives access to
//                ^                        'MessageClient' and 'GraphClient'
//                ^ -- 'EventFired' gives you access to the data that matched the
//                     subscription. Since GraphQL queries return JSON it is very easy
//                     to work with the data in JavaScript/TypeScript

        return Promise.all(e.data.Issue.map(i =>
            ctx.messageClient.addressChannels(`Got a new issue \`${i.number}# ${i.title}\``,
//                            ^ -- besides responding, you can address users and
//                                 channels in Slack by using the respective methods
//                                 on 'MessageClient'

                i.repo.channels.map(c => c.name))))
//              ^ -- in our correlated data model, repositories can be mapped to
//                   channels in a chat team. This will effectively send a message
//                   into each mapped channel
            .then(() => {
                return Promise.resolve({ code: 0 });
//                                     ^ -- Event handlers are expected to return a
//                                          'HandlerResult'. Nonzero code indicate
//                                          error occurred
            });
    }
}
```

This event handler registers a GraphQL subscription on the `Issue` type. On `Issue` events the handler will
send a simple message back to the associated slack team.

For more information, please see [Event Handlers](docs/EventHandlers.md).

### Register Handlers

In order to register your handlers with the automation-client, please create a file called `atomist.config.ts` and put
the following contents into it:

```typescript
import { Configuration } from "@atomist/automation-client/configuration";

import { HelloWorld } from "./commands/HelloWorld";
import { HelloIssue } from "./events/HelloIssue";

export const configuration: Configuration = {
//                          ^ -- 'Configuration' defines all configuration options

    name: "your_module_name",
//  ^ -- each automation-client should have a unique name

    version: "0.0.1",
//  ^ -- and a semver version

    teamIds: ["T29E48P34"],
//  ^ -- the ids of your chat teams which you can get by running '@atomist pwd'
//       leave empty to use your user defaults saved by atomist-config

    commands: [
//  ^ -- register all your command handlers
        () => new HelloWorld(),
    ],

    events: [
        () => new HelloIssue(),
    ],
//  ^ -- the same for event handlers

    token: process.env.GITHUB_TOKEN || "34563sdf......................wq455eze",
//  ^ -- configure a GitHub personal access token with read:org scope; this is used to
//       authenticate the automation-client with Atomist to make sure the client should
//       be granted access to the ingested data and chat team; leave null/undefined
//       to use your user default saved by atomist-config
};
```

This file allows you to register your handlers as well as to specify name and version for your automation-client.

## Running the Automation-Client

There are several ways you can run your automation-client and have it connect to Atomist API.

### Running Locally

To start up the client locally and have it listen to incoming events, just run:

```
$ npm start
```

### Pushing to Cloud Foundry

To prepare for your automation-client to run on any Cloud Foundry
instance, please make sure that you have an account on an instance of
Cloud Foundry and that you have the Cloud Foundry CLI installed,
configured and logged in.

First you need to create a `manifest.yml` in the root of your node
project. Put the following minimum content into the file:

```

applications:
- name: YOUR_APP_NAME
  command: $(npm bin)/atomist-client
  memory: 128M
  buildpack: https://github.com/cloudfoundry/nodejs-buildpack
  env:
    GITHUB_TOKEN: <your GITHUB_TOKEN>
    SUPPRESS_NO_CONFIG_WARNING: true
```

There more recommended ways for getting your `GITHUB_TOKEN` into your automation-client instance.
Take a look at [`cfenv`](https://www.npmjs.com/package/cfenv) for example

Next please add an `"engines"` top-level entry to your `package.json`
like the following:

```javascript
  "engines": {
    "node": "8.x.x",
    "npm": "5.x.x"
  }
```

Now you're ready to `cf push` your automation server to Cloud Foundry:

```
$ cf push
```

## Dashboard (experimental)

The `automation-client` serves up a simple dashboard and GraphQL browser to explore data and author queries. When
client is running head over to `http://localhost:2866/` or `http://localhost:2866/graphql`.

## REST APIs

When starting up, the `automation-client` exposes a couple of endpoints that can be accessed via HTTP.

### Authentication

The endpoints are protected by HTTP Basic Auth or token-based authentication. When starting the client, you'll see
a log message of the following format:

```
2017-09-20T08:22:32.789Z - info	: Auto-generated credentials for web endpoints are user 'admin' and password '4d6390d1-de5c-6764-a078-7308503ddba5'
```

By default the automation-client auto-generates some credentials for you use. To configure your own credentials, change
`atomist.config.ts` and put a following section in:

```typescript
export const configuration: Configuration = {
    ...
    http: {
        enabled: true,
        auth: {
            basic: {
                enabled: true,
                username: "some user",
                password: "some password",
            },
        },
    },
};
```

### Endpoints

#### GET Management Endpoints

| Path  | Description |
|-------|-------------|
| `/metrics` | exposes metrics around command, event handler executions |
| `/commands` | all incoming request for running command handlers |
| `/events` | all incoming events for event handlers |
| `/messages` | all outgoing messages sent by handlers |
| `/automations` | metadata of all available automations |

As an example, here is an a command to get the current metrics:

```
$ curl -X GET \
     http://localhost:2866/metrics \
     -H 'authorization: Bearer 34563sdf......................wq455eze"' \
     -H 'content-type: application/json'
```

The above endpoints are all HTTP GET and take bearer and basic auth per default. See below for more details about
authentication.

#### Invoking a command handler or ingestor

Command handlers are exposed via HTTP GET like the following:

```
$ curl -X GET \
     http://localhost:2866/command/hello-world?name=cd \
     -H 'authorization: Bearer 34563sdf......................wq455eze"'
```

This would invoke the `HelloWorld` command handler from above using `cd` as value of `name`.

You can also post the following payload to your command handler:

```
$ curl -X POST \
    http://localhost:2866/command/hello-world \
    -H 'content-type: application/json' \
    -H 'authorization: Bearer 34563sdf......................wq455eze"'
    -d '{
    "parameters": [{
      "name": "name", "value": "cd"
    }],
    "mapped_parameters": [{
      "name": "slackUser", "value": "U095T3BPF"
    }]
  }'
```

Similarly, `Ingestors` can be invoked via:

```
curl -X POST \
  http://localhost:2866/ingest/hello \
  -H 'content-type: application/json' \
  -d '{ "name": "cd" }'
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
