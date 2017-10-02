# Mapped Parameters

Mapped parameters are special parameters that aren't gathered from users but supplied, like secrets, by the Atomist runtime.

Like normal parameters, they are specified using decorators and injected into a fresh instance before the `handle` ``function is called.

The following example provides the current GitHub owner name:
```
@MappedParameter(MappedParameters.GITHUB_OWNER)
public targetOwner: string;
```