# Handler Concepts

The two core automations Atomist provides are:

-   **[Command handlers](CommandHandlers.md)**: Automations that are typically invoked by a human, and may gather parameters before execution
-   **[Event handlers](EventHandlers.md)**: Automations that are invoked as a result of an event in the Cortex data model

Both types of automation have the following in common:

-   Configuration via [decorators](Decorators.md)
-   Lifecycle where a fresh instance is used for each invocation, after being populated with the appropriate instance data
-   Access to a handler context
-   Ability to work with [secrets](Secrets.md) managed by Atomist
-   Ability to query the Atomist Cortex, in the context of the current team
-   Ability to work with project contents, using [project operations](ProjectOperations.md).
-   Returning a Promise of a `HandlerResult`.
