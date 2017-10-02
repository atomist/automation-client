# Atomist Concepts

## Overview

Atomist enables powerful development automation.

This starts with the **Atomist Cortex**: a rich, interconnected model of the things that matter to your team, such as your projects, their source code, builds, deploys and the communication channels around them. The Atomist service keeps the Cortex up to date as events occur. 

Atomist enables you to write code to react to events affecting the model--with access to the full context--and write commands informed by it. It also manages secrets to ensure that automations always have access to the correct credentials, whichever user invoked them.

## Changing the World
Atomist enables three key ways of interacting with the world:

- Changes to code or configuration, made by *editing* projects. See [Project Operations](ProjectOperations.md).
- API calls to systems such as GitHub or Travis (or arbitrary code). See [Secrets.md]().
- Notifications to people or teams, typically via Slack, benefiting from Atomist's ability to relate Slack and other identities (such as GitHub identities).

For example, Atomist makes it possible to implement scenarios such as: 

|  Scenario |  Automation type | Implementation  | 
|---|---|---|
| When a commit breaks the build, sent a DM in Slack to the developer who made the offending commit to alert them | Event handler   | Subscribe to a build with a failed status, specifying a GraphQL query that retrieves the commit, committer, person and Slack ID (if available) of the person. Use this library to send the user a DM.  |   |  
|  When a PR causes an JSON file to be ill-formed, set a failed status on it |  Event handler | React to a PR, looking at the last commit and using this project's support to clone the repo using the token managed by Atomist as a secret. Attempt to parse the content; if it fails, use the GitHub status API (with the same token) to set a status. 
|  Look for all imports of a given module across all projects in an organization  | Command handler   | Extend this project's convenient `EditorCommandSupport` class to look into the contents of all repos in the present team.  |   |   |
 When there's a new release of a library, create a branch in all Maven or `npm` projects depending on that library. For each build, if it succeeds, raise a PR on the branch. If it fails, create an issue in the repository warning of the problem.   |  Event handler | React to a tag with a non-snapshot semantic version. Look for all projects using the library (see above) and edit them to create the branch. Write a separate event handler that reacts to the builds of these branches.
 
 Because automations are written in TypeScript (or JavaScript), you can use normal programming practices to pull out common behavior for reuse. 

## Atomist Clients

Code in automations is written in Atomist clients, which interact with the Atomist service primarily by [GraphQL](http://graphql.org/).

Clients can be written in any language, but we recommend our `node` client (this project), which makes things much easier.

Each client is itself a server, which hosts automations that can be invoked via the Atomist bot or other means. A client can host any number o automations, and can be hosted wherever the author likes: locally during testing, inside a corporate firewall, or on a public cloud or PaaS.

### Development Process
The following is a summary of the steps to create new automations:

1. Create a `node` project using the client library.
2. Add event handlers and command handlers.
3. Deploy your automations by running the project. It will automatically register with the Atomist server.