# Project Generators
Project generators are [command handlers](CommandHandlers.md) that create
projects. A
[seed repo](https://the-composition.com/no-more-copy-paste-bf6c7f96e445) is
an important Atomist concept in which content is sourced from a given
repo and transformed to create a new project, based on parameters
supplied by the user.

This library provides several convenience superclasses to
work with seed-driven generation and conceal the work of
cloning the source repository and creating a target repository.

- `AbstractGenerator`: Abstract superclass for all commands that generate projects, regardless of where their starting point content comes from.
- `SeedDrivenGenerator`: Abstract superclass for all commands that
    generate projects taking their starting points from a seed repo. Takes care of specifying the source
    and target repos, [secrets](Secrets.md) such tokens,
    and [mapped parameters](MappedParameters.md) such as target owner.
-   `UniversalSeed`: Concrete class that does a very simple
    transformation on a project.
-   `JavaSeed`: Concrete class that requests base package and other
    Java-specific features.

The transformation code in generators is provided in the form of a project editor, through overriding the following function:

```typescript
    public abstract projectEditor(ctx: HandlerContext, params: this): ProjectEditor<this>;

```

To implement your own generator, override either `UniversalSeed` or
`SeedDrivenGenerator`.