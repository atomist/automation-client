# Project Reviewers
Project Reviewers are functions that can run across projects, identifying any problems that should be addressed. They are used in Atomist automations.

## The ProjectReview Function
```typescript
export type ProjectReviewer<P = undefined, PR extends ProjectReview = ProjectReview> =
    (p: Project, context: HandlerContext, params?: P) => Promise<PR>;
```


## Implementing Project Reviewer Command Handlers

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
