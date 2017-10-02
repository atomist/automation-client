# Command Handlers
Command handlers act on the world, based on the content of the Atomist Cortex data model. They are typically invoked by a human: usually, by the Atomist bot.

Command handlers may take parameters. Like event handlers, they return a `HandlerResult`. 

## Parameters

Command handlers may take any number of **parameters**, which will be injected into a fresh instance at runtime. Parameters are specified using [decorators](Decorators.md).

For example:

```
@Parameter({
        displayName: "Desired Spring Boot version",
        description: "The desired Spring Boot version across these repos",
        pattern: /^.+$/,
        validInput: "Semantic version",
        required: false,
    })
    public desiredBootVersion: string = "1.5.6.RELEASE";
```
 
The decorated variable names the parameter. If you assign a value to the variable, as in the example, it becomes the parameter’s default value. The `@Parameter` decorator adds additional metadata via a single argument: a JavaScript object whose properties are documented in the conventions. Though the only mandatory property is `pattern`, it is recommended to also set `description`, `displayName` and `validInput` in order to help other users when invoking Rugs via the Atomist bot.

## Response Messages
Another unique feature of command handlers is the ability to respond to the invoking user in Slack, in the channel where the command was issued.

-- TODO example --

## Queries
Command handlers can issue GraphQL queries, using the `GraphClient` on the `HandlerContext` argument to their `handler` function. These queries execute against the current team.
