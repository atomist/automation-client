# Project Operations

Atomist enables you to inspect or edit the contents of projects.  One
of Atomist's distinguishing qualities is the ease with which you can
work with code, as well as the data that surrounds code, such as
builds, issues and deploys.

## Sourcing Projects to Operate On
Use the `doWithAllRepos` helper function to work with many repos. Its signature is as follows:

```typescript
export function doWithAllRepos<R, P>(ctx: HandlerContext,
                                     credentials: Credentials,
                                     action: (p: Project, t: P) => Promise<R>,
                                     parameters: P,
                                     repoFinder: RepoFinder = allReposInTeam(),
                                     repoFilter: RepoFilter = AllRepos,
                                     repoLoader: RepoLoader =
                                         defaultRepoLoader(credentials.token)): Promise<R[]> {
```

The `credentials` parameter usually contains the current GitHub token.

The most important parameter is `action` which maps from the project and parameters to the return type `R`. The subsequent parameters are optional: Default behavior will be
to load all GitHub repos associated with the current team. Pass in different functions for custom filtering, sourcing from different a source etc.

## Concepts

The `Project` and `File` interfaces allow you to work with project
content, regardless of where it's sourced from (e.g. GitHub, a local
project, or in memory). The `GitProject` interface extends `Project`
to add support for cloning projects and creating commits, branches and
pull requests. Atomist secret management makes it easy to obtain the
necessary tokens, respecting the role of the current user, in the
event of a command handler.

Three higher-level concepts: **reviewers**, **editors** and
**generators**, make it easier to work with project content,
performing cloning and git updates automatically. 

Microgrammar support
allows sophisticated parsing and updates with clean diffs. [Path expression](PathExpressions.md) support makes it possible to drill into the structure of files within projects in a consistent way, using a variety of grammars.

## Project and File Interface Concepts: Sync, Async and defer

The project and file interfaces represent a project (usually backed by
a whole repository) and a file (a single artifact within a project).

The two interfaces follow the same pattern, in being composed from
finer-grained interfaces with different purposes.

Consider the `Project` interface:

```typescript
export interface Project extends ProjectAsync, ProjectSync {
}
```

Let's examine these interfaces in turn:

-   `ProjectSync`: Does what you expect: synchronous, blocking
    operations. Following `node` conventions, synchronous functions
    end with a `Sync` suffix. They should be avoided in production
    code, although they can be very handy during tests.
-   `ProjectAsync`: Functions that return TypeScript/ES6 promises or
    `node` streams. As they are the default choice in most cases, their names do not have any distinguishing prefix or suffix.
    
### Deferring operations

Any function that returns a Promise can be deferred for later execution. This can be useful when you have many fine-grained steps and prefer the convenience of void returns.

Do this by using the `defer` wrapper function. For example:

```typescript
defer(project, project.addFile("thing", "1"));
```

- After using `defer`, it's necessary to call
`flush` on the `Project` or `File` to effect the changes. This takes
what might be many promises and puts them into a single promise.
-  Until `flush` is called, changes made by scripting operations are not visible to subsequent scripting operations. However, `flush` can be called at any time to flush intermediate working, and repeated calls to `flush` are safe.
-  Deferred operations will ultimately be executed in the order in which they were queued.
-  **Do not** mix deferred operations with synchronous or promise-returning operations without first calling `flush`, as non-scripting operations will not see changes made by scripting operations.

Methods on the `FileScripting` interface automatically defer. These method names typically begin with a `record` prefix. For example, these three code snippets are equivalent:

```typescript
const f: File = ...
f.replaceAll("foo", "bar") // Returns a promise
	.then(f => ...
```

```typescript
const f: File = ...
defer(f, f.replaceAll("foo", "bar"))
	.flush()
	.then(f => ...
```

```typescript
const f: File = ...
f.recordReplaceAll("foo", "bar")
	.flush()	          // Returns a promise
	.then(f => ...
```

In this case, it would probably be simpler to use `replaceAll`.

## Files

Files are lightweight objects that are lazily loaded. Thus keeping
many files in memory is not normally a concern.

## Projects and globs

Many methods on or related to `Project`
use [glob patterns](https://en.wikipedia.org/wiki/Glob_(programming))
to select files.

For example:

```typescript
streamFiles(...globPatterns: string[]): FileStream;
```

If no glob patterns are specified, all files are matched.

`streamFiles` uses default negative glob patterns to exclude content
that should normally be excluded, such as the `.git` directory and the
`node_module` and `target` directories found when working locally with
JavaScript or Java projects. If you want complete control over the
globs used, without any default exclusions, use the following
lower-level method:

```typescript
streamFilesRaw(globPatterns: string[], opts: {}): FileStream;
```

The return type `FileStream` extends `node` `Stream`. An example of using the streaming API directly:

```typescript
let count = 0;
project.streamFiles()
    .on("data", (f: File) => {
            count++;
        },
    ).on("end", () => {
	    console.log(`We saw ${count} files`);
	});
```

If you find promises more convenient, use the helper `toPromise`
method from `projectUtils`, which converts a stream to a promise, or
use the helper functions described in the next section.

## Convenience functions

`projectUtils` contains convenience methods for working with projects:
For example, to apply the same function to many files, or to convert a
stream of files into a promise.

For example, replacement across all files matched by a glob is very simple:

```typescript
import { doWithFiles } from "@atomist/automation-client/project/util/projectUtils";

doWithFiles(p, "**/Thing", f => f.replace(/A-Z/, "alpha"))
    .run()
    .then(_ => {
        assert(p.findFileSync("Thing").getContentSync() === "alpha");
    });
```

`parseUtils` integrates with microgrammars, and will be discussed later.

## Reviewers

`ReviewerCommandSupport` is a convenience superclass for writing
command handlers that review (look at the contents of and possibly
comment on) multiple projects.

It works with the `ProjectReviewer` type, and takes care of cloning repos:

```typescript
export type ProjectReviewer<RR extends ProjectReview> =
    (id: RepoId, p: Project, context: HandlerContext) => Promise<RR>;
```

`ProjectReview` contains repo identification and comments:

```typescript
export interface ProjectReview {

    repoId: RepoId;

    comments: ReviewComment[];
}
```

`ReviewerCommandSupport` implements the `handle` method and takes care
of cloning all repos within an org. Subclasses need to implement only
one method to return a `ProjectReviewer` function that will review
individual projects:

```typescript
projectReviewer(context: HandlerContext): ProjectReviewer<PR>;
```

Like the editor convenience class, `ReviewCommandSupport` can run
either locally or remotely, depending on the provision of a `local`
flag.

## Editors

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

## Generators

Generators are commands that create
projects. A
[seed repo](https://the-composition.com/no-more-copy-paste-bf6c7f96e445) is
an important Atomist concept in which content is sourced from a given
repo and transformed to create a new project, based on parameters
supplied by the user.

There are several convenience superclasses provided in this library to
work with seed-driven generation and wholly conceal the work of
cloning the source repository and creating a target repository.

-   `SeedDrivenGenerator`: Abstract superclass for all commands that
    generate projects from seeds. Takes care of specifying the source
    and target repos, [secrets](Secrets.md) such tokens,
    and [mapped parameters](MappedParameters.md) such as target owner.
-   `UniversalSeed`: Concrete class that does a very simple
    transformation on a project.
-   `JavaSeed`: Concrete class that requests base package and other
    Java-specific features.

The transformation code in generators can be written either using
promise or scripting style project operations. For example,
`UniversalSeed` takes a scripting approach, overriding the
`manipulate` function in `SeedDrivenGenerator`:

```typescript
public manipulate(project: ProjectNonBlocking): void {
    this.removeSeedFiles(project);
    this.cleanReadMe(project, this.description);
}
```

`SeedDrivenGenerator` automatically calls `flush` on the project after
invoking this method.

Alternatively, you can override the `manipulateAndFlush` function
itself to return a `Promise`. (In this case, `manipulate` will never
be called unless you call it in your code.)

To implement your own generator, override either `UniversalSeed` or
`SeedDrivenGenerator`.

## Local or remote operations

All convenience superclasses, such as `EditorCommandSupport`, can work
locally if passed a `local` parameter. In this case, they will look in
the current working directory, for a two-tiered directory structure,
of org and repo.

## Microgrammars

Reviewer and editor implementations will often use microgrammars. This
library provides an integration with
the
[Atomist microgrammar project](https://github.com/atomist/microgrammar). This
enables you to pull pieces of content out of files and even modify
them, with clean diffs.

Consider the following microgrammar, which picks out `npm` dependencies:

```typescript
export function dependencyGrammar(dependencyToReplace: string) {
    return Microgrammar.fromString<Dependency>('"${name}": "${version}"',
        {
            name: dependencyToReplace,
            version: /[0-9^.-]+/,
        },
    );
}

export interface Dependency {
    name: string;
    version: string;
}
```

It's possible to be able to work with matches as follows:

```typescript
return doWithFileMatches(project, "package.json",
    dependencyGrammar(dependencyToReplace), f => {
        const m = f.matches[0] as any;
        m.name = newDependency;
        m.version = newDependencyVersion;
    })
    .run()								// Return a promise
    .then(files => ...
```

Because the grammar is strongly typed, `name` and `version` fields
will be type checked. Assigning the values will result in an update to
the files in which the matches occur.

See `parseUtils.ts` for the various functions that integrate this
library with `microgrammar`.

All functions take a glob pattern as their second argument. In the
above example, `package.json` is used because the location of an `npm`
package file is well known. But it would be possible to look for all
`.json` files with a glob pattern of `**/*.json`.

*Previous versions of Rug offered path expressions. This microgrammar
integration replaces many uses of that idiom. However, pure TypeScript
equivalents of former "Rug types" may be added in future.*

## Testing

Atomist automations are easily unit testable, which is a major design goal and benefit.

This is easy with our project and file abstractions. `InMemoryProject`
offers a convenient way of creating projects and making
assertions. For example:

```typescript
it("should not edit with no op editor", done => {
    const project = InMemoryProject.of(
    {path: "thing1", content: "1"},
    {path: "thing2", content: "2"}
    );
    const editor: ProjectEditor<EditResult> = p => Promise.resolve({ edited: false });
    editor(null, project, null)
        .then(r => {
            assert(!r.edited);
            done();
        });
    });
```
