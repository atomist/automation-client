# Secret Management

One of the key benefits Atomist provides is management of secrets. Secrets are resolved per organization or *individual user* in the event of a command handler. This is an important capability, as often automations all run as the same user, making for a poor audit trail.

Secrets are injected via decorators.

For example, the following will cause an instance variable to be populated before the `handle` method of a handler is invoked:

```
@Secret(Secrets.ORG_TOKEN)
public githubToken: string;
```