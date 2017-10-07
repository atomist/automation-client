# Path Expressions

It's possible to run path expressions against projects to select AST nodes resulting from parsing using a microgrammar or other grammar.

For example:
```typescript
const mg = Microgrammar.fromString<Person>("${name}:${age}", {
        age: Integer,
    });
const fpr = new DefaultFileParserRegistry().addParser(
    new MicrogrammarBasedFileParser("people", "person", mg));

findMatches(project, AllFiles, fpr, "/people/person/name")
  .then(matches => ...
```

tbd
