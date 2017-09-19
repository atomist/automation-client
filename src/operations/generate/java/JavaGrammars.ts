import { JavaParenthesizedExpression } from "@atomist/microgrammar/matchers/lang/cfamily/java/JavaBody";
import { Microgrammar } from "@atomist/microgrammar/Microgrammar";
import { Opt } from "@atomist/microgrammar/Ops";

export const CLASS_NAME = /^[a-zA-Z_$][a-zA-Z0-9_$]+/;
export const PACKAGE_NAME = /^[a-zA-Z0-9$.]+/;

/**
 * Package part of a FQN. Includes the final dot before the class name
 * @type {RegExp}
 */
export const PACKAGE_OF_CLASS = /^[a-zA-Z0-9$.]+\./;

export const JavaPackageDeclaration = Microgrammar.fromDefinitions<{name: string}>({
    _pkg: "package",
    name: PACKAGE_NAME,
    _sc: ";",
});

export const PUBLIC_CLASS = Microgrammar.fromDefinitions<{name: string}>({
    _public: "public",
    _class: "class",
    name: CLASS_NAME,
});

/**
 * Discard annotation with content
 * @type {Microgrammar<T>}
 */
export const DISCARDED_ANNOTATION = Microgrammar.fromDefinitions({
    _at: "@",
    _annotationName: CLASS_NAME,
    _content: new Opt(JavaParenthesizedExpression),
});
