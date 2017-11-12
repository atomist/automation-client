# Project Generators
Project generators are [command handlers](CommandHandlers.md) that create
projects. A
[seed repo](https://the-composition.com/no-more-copy-paste-bf6c7f96e445) is
a starting point: it's a working starter project that gets transformed to create a new project, based on parameters
supplied by the user.

This library provides a convenient way to write a generator. In the `handle` method of your 
[command handler](https://docs.atomist.com/automation/commands/), call this generate function:


```typescript
import { generate } from "@atomist/automation-client/operations/generate/generatorUtils";


generate(seedProject,
    ctx,
    {token: params.githubToken},
    params.projectEditor(ctx, params),
    GitHubProjectPersister,
    params)
```

See an example in 
[NewAutomation](https://github.com/atomist/automation-client-samples-ts/tree/master/src/commands/generator/NewAutomation.ts).
