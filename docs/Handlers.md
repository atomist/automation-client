# Handler Concepts
The two core automations Atomist provides are 

- **Command handlers**: Automations that are typically invoked by a human, and may gather parameters before execution
- **Event handlers**: Automations that are invoked as a result of an event in the Cortex data model.

Both types of automations have the following in common:

- Configuration via decorators
- Access to a handler context
- Ability to work with secrets managed by Atomist
- Ability to query the Atomist Cortex, in the context of the current team
- Ability to work with project contents, using [project operations](ProjectOperations.md).
- Returning a `HandlerResult`

