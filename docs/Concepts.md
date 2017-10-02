# Atomist Concepts

## Overview

Atomist enables development automation.

This starts with the **Atomist Cortex**: a rich, interconnected model of the things that matter to your team, such as your projects, their source code, builds, deploys and the communication channels around them. The Atomist service keeps the Cortex up to date as events occur. 

Atomist enables you to write code to react to events affecting the model--with access to the full context--and write commands informed by it. It also manages secrets to ensure that automations always have access to the correct credentials, whichever user invoked them.

## How Atomist Acts
Atomist enables three key ways of interacting with the world:

- Changes to code or configuration, made by *editing* projects. See [Project Operations](ProjectOperations.md).
- API calls to systems such as GitHub or Travis (or arbitrary code). See [Secrets](library taking care of cloning them and creating commits, branches and pull ).
- Notifications to people or teams, typically via Slack.

## Atomist Clients

Code in automations is written in Atomist clients, which interact with the Atomist service primarily by [GraphQL](http://graphql.org/).

Clients can be written in any language, but we recommend our `node`(this project), which makes things much easier.

Each client is itself a server, which hosts automations that can be invoked via the Atomist bot or other means.

### Development Process
The following is a summary of the steps to create new automations:

1. Create a `node` project using the client library.
2. Add event handlers and command handlers.
3. Deploy your automations by running the project