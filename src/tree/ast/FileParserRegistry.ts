import { SelfAxisSpecifier } from "@atomist/tree-path/path/axisSpecifiers";
import { isNamedNodeTest } from "@atomist/tree-path/path/nodeTests";
import {
    isUnionPathExpression,
    PathExpression,
} from "@atomist/tree-path/path/pathExpression";
import { toPathExpression } from "@atomist/tree-path/path/utils";
import { Dictionary } from "lodash";
import { FileParser } from "./FileParser";

/**
 * Registry of FileParsers. Allows resolution of the appropriate parser
 * for a path expression
 */
export interface FileParserRegistry {

    /**
     * Find a parser for the given path expression.
     * It's first location step must start with a node name.
     * If the FileParser supports validation, validate that it
     * can execute the path expression and throw an exception if not.
     * @param {string | PathExpression} pex
     * @return {FileParser}
     */
    parserFor(pex: string | PathExpression): FileParser | undefined;
}

/**
 * Implementation of FileParserRegistry implementing fluent builder pattern
 */
export class DefaultFileParserRegistry implements FileParserRegistry {

    private parserRegistry: Dictionary<FileParser> = {};

    public addParser(pr: FileParser): this {
        this.parserRegistry[pr.rootName] = pr;
        return this;
    }

    public parserFor(pathExpression: string | PathExpression): FileParser | any {
        const parsed: PathExpression = toPathExpression(pathExpression);
        if (!isUnionPathExpression(parsed)) {
            const determiningStep = parsed.locationSteps.find(s => s.axis !== SelfAxisSpecifier);
            if (!!determiningStep && isNamedNodeTest(determiningStep.test)) {
                const parser = this.parserRegistry[determiningStep.test.name];
                if (!!parser) {
                    if (parser.validate) {
                        parser.validate(parsed);
                    }
                    return parser;
                }
            }
        }
        return undefined;
    }

    public toString() {
        return `DefaultFileParserRegistry: parsers=[${Object.getOwnPropertyNames(this.parserRegistry)}]`;
    }
}
