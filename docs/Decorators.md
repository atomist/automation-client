# Decorators
Both [event handlers](EventHandlers.md) and [command handlers](CommandHandlers.md) work with [TypeScript decorators](https://www.typescriptlang.org/docs/handbook/decorators.html). These identify values that will be injected into a fresh instance each time the handler runs. If you're familiar with Spring, this will be particularly intuitive.

Consider the following code within a command handler:

```
@Parameter({
        displayName: "Desired Spring Boot version",
        description: "The desired Spring Boot version across these repos",
        pattern: /^.+$/,
        validInput: "Semantic version",
        required: false,
    })
    public desiredBootVersion: string = "1.5.6.RELEASE";
```
 The value of the `desiredBootVersion` parameter (if provided) will be injected into an instance before the `handle` function is called.
    
The decorated variable names the parameter. If you assign a value to the variable, as in the example, it becomes the parameter’s default value.