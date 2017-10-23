# Project Editors
Project editors are functions that can modify a project.

They are usually invoked from [command handlers](CommandHandlers.md). Project editors are also used to implement [project generators](ProjectGenerators.md).

## The ProjectEditor function
The signature of the `ProjectEditor` is as follows:

```typescript
export type ProjectEditor<P = undefined, ER extends EditResult = EditResult> =
    (p: Project, context: HandlerContext, params?: P) => Promise<ER>;
```
The parameter of type `Project` may be mutated by invocation of the editor function. Projects, like real world file systems, are mutable.

## Implementing Editor commands

`EditorSupport` is a convenience superclass for editing (modifying)
projects. It is designed to make it easy to implement command handlers
that work with a `ProjectEditor` function type, taking care of git
cloning and updates.

```typescript
export type ProjectEditor<ER extends EditResult> =
    (id: RepoId, p: Project, context: HandlerContext) => Promise<ER>;

export interface EditResult {

    /**
     * Whether or not this project was edited
     */
    edited: boolean;
}
```

`ProjectEditor` functions can be reused.

An example of a simple editor command extending the
`EditorCommandSupport` super class:

```typescript
@CommandHandler("Upgrade versions of Spring Boot across an org", "upgrade spring boot version")
@Tags("atomist", "spring")
export class SpringBootVersionUpgrade extends EditorCommandSupport {

    @Parameter({
        displayName: "Desired Spring Boot version",
        description: "The desired Spring Boot version across these repos",
        pattern: /^.+$/,
        validInput: "Semantic version",
        required: false,
    })
    public desiredBootVersion: string = "1.5.6.RELEASE";

    public projectEditor(): ProjectEditor<EditResult> {
    	// Construct the actual editor
        return setSpringBootVersionEditor(this.desiredBootVersion);
    }
}
```

This will act on all repos associated with the current team. A filter
can be specified in the constructor.

The `ProjectEditor` function uses the `Project` and `File` interfaces
to change each project it is invoked on.

## Editor Chaining
tbc