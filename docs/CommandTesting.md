# Automated tests for command handlers

Test commands by testing the `handle` method. This section describes the Atomist team's testing style for commands, but there are many ways to test. If you already have a favorite TypeScript or JavaScript testing style and framework, use that.

We use [Mocha](https://mochajs.org/) for unit tests in our automation clients, with [power-assert](https://github.com/power-assert-js/power-assert) for enhanced failure messages.

Tests live in the `test/` directory. Run them with `npm run test`.

Commands usually produce side-effects, so we test by passing fake
objects to substitute for `messageClient`, `graphClient`,
etc. Creating fakes is easy in a language like JavaScript or
TypeScript.

For instance, to test
[a command](https://github.com/atomist/automation-client-samples-ts/blob/master/src/commands/simple/HelloChannel.ts)
that sends a message to a Slack channel, make a fake `messageClient` that only
has one function:

```typescript
// create a fake message client.
const fakeMessageClient = {
   addressChannels(message, channel) {
       this.channelThatWasSent = channel; // store what you care about
       return Promise.resolve(); // fake a return value
   },
};

// cast the context to the type we need
const fakeContext = { messageClient: fakeMessageClient } as any as HandlerContext;
```

Check out the
[full test](https://github.com/atomist/automation-client-samples-ts/blob/master/test/commands/simple/HelloChannelTest.ts)
for a full description.

### Testing editors and generators

For commands that use automation-client functions to [create or change code](#make-a-code-change), we typically test
only the project-editing function. There is an implementation of `Project` that is all in-memory, for easy testing.
For example:

```typescript
// describe each pretend file in the input project
const project = InMemoryProject.of({ path: "README.md", content: "# This is the README" },
                                   { path: "package.json", content: `{ "name": "my-project" }`});

const result = editProject(project,
                           null, // context is not used
                           { newYear: "2222" }); // parameters
```

Check out the
[whole example](https://github.com/atomist/automation-client-samples-ts/blob/master/test/commands/editor/UpdateCopyrightEditorTest.ts)
in the samples.
