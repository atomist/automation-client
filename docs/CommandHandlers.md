# Command Handlers

Command handlers define an Atomist Bot command.  Thus, command
handlers provide an easy way for you to define your own "bot commands"
that act on the world, with access to any system you have access to
_and_ the Atomist Cortex data model.  They are typically invoked by a
human by sending a message to the Atomist bot.

Command handlers may take parameters. Like event handlers, they return
a `HandlerResult`.

## Intent

Each command handler has an associated "intent", i.e., the message the
Atomist Bot will associate with that command handler.  When the
Atomist bot receives a message matching the intent, it will invoke the
associated command handler.  You provide the intent as the second
argument to the `@CommandHandler` decorator on the command handler
class.  The first argument is a description of the command handler.
In the example below, the registered intent is "hello world".

```typescript
@CommandHandler("Sends a hello back to the client", "hello world")
export class HelloWorld implements HandleCommand {
    public handle(ctx: HandlerContext): Promise<HandlerResult> {
        ...
    }
}
```

When you send the message `@atomist hello world` in a channel to which
the Atomist Bot has been invited, it will execute the `handle` command
in the `HelloWorld` class.

## Parameters

Command handlers may take any number of **parameters**, which will be
injected into a fresh instance at runtime. Parameters are specified
using [decorators](Decorators.md).

For example:

```typescript
@Parameter({
    displayName: "Desired Spring Boot version",
    description: "The desired Spring Boot version across these repos",
    pattern: /^.+$/,
    validInput: "Semantic version",
    required: false,
})
public desiredBootVersion: string = "1.5.6.RELEASE";
```

The decorated variable names the parameter.  If you assign a value to
the variable, as in the example, it becomes the parameter’s default
value.  The `@Parameter` decorator adds additional metadata via a
single argument: a JavaScript object whose properties are documented
in the conventions.  Though the only mandatory property is `pattern`,
it is recommended to also set `description`, `displayName` and
`validInput` in order to help other users when invoking the command
via the Atomist bot.

## Response Messages

Another unique feature of command handlers is the ability to respond
to the invoking user in Slack, in the channel where the command was
issued.

`ctx.messageClient.respond("No, but thank you for asking.");`

## Queries

Command handlers can issue GraphQL queries, using the `GraphClient` on
the `HandlerContext` argument to their `handler` function.  These
queries execute against the current team.
