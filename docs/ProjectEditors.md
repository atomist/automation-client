# Project Editors
Project editors are functions that can modify a project.

They are usually invoked from [command handlers](CommandHandlers.md). Project editors are also used to implement [project generators](ProjectGenerators.md).

To edit one project, specify:

-  GitHub credentials: see [Secrets](commands.md#secrets) for how to do this operation as the user who invoked the command,
-  How to edit the project: Atomist uses a [Project](https://atomist.github.io/automation-client-ts/modules/_project_project_.html)
object to model operations on a repository; pass a function that changes it.
-  How to save your work: make a [Pull Request](https://atomist.github.io/automation-client-ts/classes/_operations_edit_editmodes_.pullrequest.html)
or [commit to a branch](https://atomist.github.io/automation-client-ts/interfaces/_operations_edit_editmodes_.branchcommit.html).
-  which repository to edit: see [Mapped Parameters](commands/#mapped-parameters)
for how to guess this from the channel where the command is invoked.


The `handle` method contains of a project editor command to add a CONTRIBUTING.md file might look like:

```typescript
function editProject(p: Project) {
    return p.addFile("CONTRIBUTING.md", `Yes! Contributions are welcome`)
}

const pullRequest = new PullRequest("contributing", "Add CONTRIBUTING.md");

const gitHubRepo = new GitHubRepoRef(this.owner, this.repository);

return editOne(context,
    { token: this.githubToken }, // GitHub credentials
    editProject, // a function to change the project
    pullRequest, // how to save the edit
    gitHubRepo) // where to find the project
    .then(success, failure);
```

Check [the complete source](https://github.com/atomist/automation-client-samples-ts/tree/master/src/commands/editor/AddContributing.ts) for the necessary imports.

## Edit across repositories

You can update all your repositories at once!

You need a function to edit the project. This one gets the project, the HandlerContext and some additional parameters.
It returns an EditResult.

```typescript
export function editProject(p: Project, context: HandlerContext, params: { newYear: string }): Promise<EditResult> {
    return p.findFile("README.md")
        .then(file => file.replace(/(Copyright.*\s)[0-9]+(\s+Atomist)/, `$1${params.newYear}$2`))
        .then(() => successfulEdit(p), (err) => failedEdit(p, err));
}
```

Then in the handle method, use `editAll` to run on all the projects that Atomist can find:

```typescript
        return editAll(context,
            { token: this.githubToken }, // GitHub credentials
            editProject, // how to change the project
            new PullRequest("update-copyright-year", "Update the copyright to " + this.newYear), // how to save the edit
            { newYear: this.newYear }) // parameters to pass on to the edit function
            .then(success, failure);
```

Find the [complete example here](https://github.com/atomist/automation-client-samples-ts/tree/master/src/cs/editor/UpdateCopyright.ts)


## The ProjectEditor function

In the first example above, the editProject function is from Project to Promise<Project>. Project Editor functions can be more detailed.

The signature of the `ProjectEditor` is as follows:

```typescript
export type ProjectEditor<P = undefined, ER extends EditResult = EditResult> =
    (p: Project, context: HandlerContext, params?: P) => Promise<ER>;
```
The parameter of type `Project` may be mutated by invocation of the editor function. Projects, like real world file systems, are mutable.

`ProjectEditor` functions can be reused.
