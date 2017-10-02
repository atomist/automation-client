# Decorators
Both event handlers and command handlers work with decorators. These identify values that will be injected into a fresh instance each time the handler runs.

Consider the following code:

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
 
    
The decorated variable names the parameter. If you assign a value to the variable, as in the example, it becomes the parameter’s default value.