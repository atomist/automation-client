# Project Operations

Atomist enables you to inspect or edit the contents of projects. 

## Concepts
The `Project` and `File` interfaces allow you to work with project contents, regardless of where it's sourced (e.g. GitHub, a local project, or in memory). requests. The `GitProject` interface adds support fo cloning projects and creating commits, branches and pull requests.

Two higher-level concepts: **reviewers** and **editors**, make it easier to work with project content, allowing you to clone in many cases. Microgrammar support allows sophisticated parsing and updates with clean diffs.

## Project and File interfaces
The project and file interfaces follow the same pattern, in being broken into fine-grained interfaces.

```
export interface ProjectNonBlocking extends ProjectScripting, ProjectAsync {

}

export interface Project extends ProjectScripting, ProjectAsync, ProjectSync {

}
``` 

Let's examine all these interfaces in turn, starting with the simplest:

- `ProjectSync`: Does what you expect. Following `node` conventions, synchronous methods end with a `Sync` suffix. They should be avoided in production code, although they can be very handy during tests.
- `ProjectAsync`: 
- `ProjectScripting`: 



## Reviewers

CONVENIENCE CLASs

Local or remote

## Editors

convenience class

## Microgrammars
Reviewer and editor implementations will often use microgrammars. This library provides an integration with the [Atomist microgrammar project](https://github.com/atomist/microgrammar). This enables you to pull pieces of content out of files and even modify them, with clean diffs.

Consider the following microgrammar, which picks out `npm` dependencies:

```
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

```
return doWithFileMatches(project, "package.json",
    dependencyGrammar(dependencyToReplace), f => {
        const m = f.matches[0] as any;
        m.name = newDependency;
        m.version = newDependencyVersion;
    })
    .run()								// Return a promise
    .then(files => ...			// Do with the file matches
```
Because the grammar is strongly typed, `name` and `version` fields will be type checked. Assigning the values will result in an update to the files in which the matches occur.

See `parseUtils.ts` for the various functions that integrate this library with `microgrammar`.

All functions take a glob pattern as their second argument. In the above example, `package.json` is used because the location of an `npm` package file is well known. But it would be possible to look for all `.json` files with a glob pattern of `**/*.json`.

*Previous versions of Rug offered path expressions. This microgrammar integration replaces many uses of that idiom. However, pure TypeScript equivalents of former "Rug types" may be added in future.*

## Testing
We've always emphasized testability of Atomist automations.

This is easy with these interfaces. `InMemoryProject`:

eg

```
it("should not edit with no op editor", done => {
    const project = tempProject();
    const editor: ProjectEditor<EditResult> = p => Promise.resolve({ edited: false });
    editor(null, project, null)
        .then(r => {
            assert(!r.edited);
            done();
        });
    });
```


                