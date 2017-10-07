# Path Expressions

It's possible to run path expressions against projects to select [AST](https://en.wikipedia.org/wiki/Abstract_syntax_tree) nodes resulting from parsing using a [microgrammar](https://en.wikipedia.org/wiki/Abstract_syntax_tree) or other grammar. Atomist path expressions are inspired by [XPath](https://www.w3.org/TR/xpath/).

Path expressions are a good solution for working with ASTs as they can be so noisy. (For example, the Java--and especially, the Python--ASTs contain many levels that can be surprising even to experts in those languages.) Thus navigating via properties or through explicitly traversing children can be difficult and error-prone. The "descendants" (`//`) "axis specifier" in path expressions makes it easy to skip levels, greatly simplifying expressions. Path expressions also decouple navigation from logic, fostering reuse.

## Usage

The `findMatches` function in `astUtils` makes it possible to execute a path expression across many files, as identified by a glob pattern:

```typescript
const mg = Microgrammar.fromString<Person>("${name}:${age}", {
        age: Integer,
    });
const fpr = new DefaultFileParserRegistry().addParser(
    new MicrogrammarBasedFileParser("people", "person", mg));

findMatches(project, AllFiles, fpr, "/people/person/name")
  .then(matches => ...
```

It's possible to update matches, simply by setting the `$value` property on a match. The project will automatically be updated on the next flush. (To understand flushing, see [project operations](ProjectOperations.md).)

This programming model is consistent across all grammars.

## Navigation
All matches implement the `TreeNode` interface, exposing `$value` and `$children` properties.

Additional navigation methods are added for convenience.

Imagine the following tree:

```
people
├── person 
	├── name
	├── age
├── person 
	├── name
	├── age
```
This can be navigated via `TreeNode` method with the root `$name` = "people" and two `$children` with name `person`, each with children representing the terminal nodes.

However, it can be more convenient to use properties.

The `people` node will have a `persons` property that contains an array of `person` nodes. (Note that an `s` is added to the node.) Each `person` node will have a scalar terminal for `name` and `age`, as the infrastructure can determine that these must be scalar to be unique.

When working with non-terminal scalar properties, use the node name _without_ the `s` suffix. For example, `people.person` will return a single `person` node. In this case it will be the last `person` node seen, which won't be very useful. But in the case of a known scalar value, it will be easier than working with an array. Both properties--with `s` suffix and without--will be added in all cases.

## SPI: TreeNodes and FileParser
Path expressions and `astUtils` are backed by implementations of the simple `TreeNode` interface: 


```typescript
export interface TreeNode {

    readonly $name: string;

    $children?: TreeNode[];

    /**
     * Value, if this is a terminal node
     */
    $value?: string;

    /** Offset from 0 in the file, if available */
    readonly $offset?: number;

}
```
This makes it simple to expose any parsed structure so that it has path expression support.

Implementations of the `FileParser` SPI interface parse files into `TreeNodes`:

```typescript
export interface FileParser {

    /**
     * Name of the top level production: name of the root TreeNode
     */
    rootName: string;

    /**
     * Parse a file, returning an AST
     * @param {File} f
     * @return {TreeNode} root tree node
     */
    toAst(f: File): Promise<TreeNode>;
}

```
The `FileParserRegistry` type makes it possible to register multiple `FileParser` instances and have automatic resolution when working with multiple files, based on the first location step of path expressions. For this to work, the first location step must specific the node name. For example, the following will work because it identifiers the `magicThing` top level AST node:

```
/magicThing//subThing
```
Whereas this will not, as the top level node isn't specified:

```
//otherThing/that
```

