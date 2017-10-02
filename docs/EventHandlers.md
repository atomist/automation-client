# Event Handlers

Event handlers are triggered by events that create or update entities
in the Atomist Cortex that meet certain criteria.

## Setting Up a Subscription

First, define a query representing the data you want to match on. You
typically begin by exploring Cortex data using a GraphQL
client. GraphiQL is a great choice.

You will get assistance for writing your queries, and see the shape of
the resulting data.

![GraphiQL browser](images/graphiql.png)

Once you're happy with your query, add it beginning with
`subscription` to the `/graphql` directory of your project.

Based on your query it is possible to generate TypeScript types that
you can use in your handler code.  In order to allow type generation
you need to set up your project in the following way:

```
$ npm install --save-dev graphql-code-generator
```

And add the following to the `scripts` section of your `package.json`:

```javascript
  "gql:gen": "ql-gen --file node_modules/@atomist/automation-client/graph/schema.cortex.json --template typescript -m --out ./src/typings/ './graphql/**/*.graphql'"
```

Next, generate TypeScript types for your query returns and variables:

```
$ npm run gql:gen
```

You can rerun this command at any time, if you add or change queries.

Now import the generated types in your event handlers.

A subscription is set up by referencing the appropriate GraphQL file as follows, using the `EventHandler` decorator:

```typescript
@EventHandler("Event handler that notifies upstream PR of failed downstream build",
    GraphQL.subscriptionFromFile("graphql/cascadeBuildCompleted"))
@Tags("cascade", "build", "status")
export class SetUpstreamStatusOnBuildCompletion implements HandleEvent<graphql.BuildCompleted.Subscription> {

    @Secret(Secrets.ORG_TOKEN)
    public githubToken: string;

    public handle(root: EventFired<graphql.BuildCompleted.Subscription>,
                  ctx: HandlerContext): Promise<HandlerResult> {
        // ... implementation
    }
```

An event handler may do further filtering on the argument passed in,
if it needs to apply criteria that cannot be expressed in GraphQL.

Otherwise, the implementation of an event handler is similar to a
command handler.  It also returns a promise.  However, the concept of
a response message does not apply, as an event handler is not invoked
from a command issued in a Slack channel.  Even handlers can send
messages directed to specific channels and/or users.
