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

```typescript
import { CommandHandler, Parameter} from "@atomist/automation-client/decorators";
import { HandleCommand, HandlerContext, HandlerResult } from "@atomist/automation-client/Handlers";

@CommandHandler("HelloWorld", "Sends a hello back to the client", "hello world")
//               ^ -- this defines a command handler               ^ -- defines the command to trigger  
//                    named "HelloWorld"                                this handler from the bot
export class HelloWorld implements HandleCommand {
//                                 ^ -- a command handler implements the HandleCommand interface
    
    @Parameter({ pattern: /^.*$/, required: true })
//  ^ -- this defines a user-provided parameter named 'name'
//               ^ -- the parameter can be validated against a RegExp pattern
//                                ^ -- parameters can be marked required or optional (required is default)
    public name: string;


    public handle(ctx: HandlerContext): Promise<HandlerResult> {
//  ^ -- this method is the body of the handler and where the actual code goes
//                ^ -- HandlerContext provides access to a 'MessageClient' for sending messages to the bot 
//                     as well as a 'GraphClient' to query your data using GraphQL
        return ctx.messageClient.respond(`Hello ${this.name}`)
//                               ^ -- Calling 'respond' on the 'MessageClient' will send a message back to
//                                    wherever that command is invoked from (eg. a DM with @atomist in Slack)             
            .then(() => {
                return Promise.resolve({ code: 0 });
//                                     ^ -- Command handlers are expected to return a 'Promise' of type
//                                          'HandlerResult' which just defines a return code. None 0 
//                                           return codes indicate errors.                
            });
    }
}

```

The above declares a simple bot command that can be invoked via `@atomist hello world`. The command takes one
parameter called `name`. The handler will respond with a simple greeting message.

## Event Handlers

Event handlers are automations that allow handling of events based on registered GraphQL subscriptions.

To create a event handler take a look at the following example:

```typescript
import { EventFired, EventHandler, HandleEvent, HandlerContext, HandlerResult }
    from "@atomist/automation-client/Handlers";

@EventHandler("HelloIssue", "Notify channel on new issue", `subscription HelloIssue {
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
//             ^ -- Defines an event handler named          ^ -- This is GraphQL subscription you want to match
//                  'HelloIssue'                                 to trigger your handler. Queries can also be
//                                                               externalized
export class HelloIssue implements HandleEvent<any> {
//                                 ^ -- an event handler implements the 'HandleEvent' interface
    
    public handle(e: EventFired<any>, ctx: HandlerContext): Promise<HandlerResult> {
//                ^ -- 'EventFired' gives you access to the data that matched the subscription. Since GraphQL 
//                      queries return JSON it is very easy to work with the data in JavaScript/TypeScript  
//                                    ^ -- 'HandlerContext' gives access to 'MessageClient' and 'GraphClient'     
        return Promise.all(e.data.Issue.map(i =>
            ctx.messageClient.addressChannels(`Got a new issue \`${i.number}# ${i.title}\``,
//                            ^ -- besides responding you can address users and channels in Slack by using the
//                                 respective methods on 'MessageClient'            
                i.repo.channels.map(c => c.name ))))
//              ^ -- in our correlated data model repositories can be mapped to channels in a chat team. This 
//                   will effectively send a message into each mapped channel                
            .then(() => {
                return Promise.resolve({ code: 0 });
//                                     ^ -- Event handlers are expected to return a 'HandlerResult'. None 0 
//                                          code indicate error occurred                 
            });
    }
}

```

This event handler registers a GraphQL subscription on the `Issue` type. On `Issue` events the handler will
send a simple message back to the associated slack team.

## Register Handlers

In order to register your handlers with the Automation client, please create a file called `atomist.config.ts` and put
the following contents into it:

```typescript
import { Configuration } from "@atomist/automation-client/configuration";

import { HelloWorld } from "./commands/HelloWorld";
import { HelloIssue } from "./events/HelloIssue";

export const configuration: Configuration = {
//                          ^ -- 'Configuration' defines all possible configuration options    
    
    name: "your_module_name",
//  ^ -- each automation-client should have a unique name
    
    version: "0.0.1",
//  ^ -- and a semver version    
    
    teamId: "T1L0VDKJP",
//  ^ -- the id of your chat team which you can get by running '@atomist pwd'    
    
    commands: [
//  ^ -- register all your command handlers        
        () => new HelloWorld(),
    ],
    
    events: [
        () => new HelloIssue(),
    ],
//  ^ -- the same for event handlers    
    
    token: "34563sdf......................wq455eze",
//  ^ -- configure a GitHub personal access token with org:read scope; this is used to authenticate the 
//       automation-client with Atomist to make sure the client should be granted access to the ingested data
//       and chat teamx^    
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
