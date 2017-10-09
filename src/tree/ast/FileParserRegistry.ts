import { Dictionary } from "lodash";
import { isNamedNodeTest } from "../path/nodeTests";
import { PathExpression } from "../path/pathExpression";
import { toPathExpression } from "./astUtils";
import { FileParser } from "./FileParser";
import { SelfAxisSpecifier } from "../path/axisSpecifiers";

/**
 * Registry of FileParsers. Allows resolution of the appropriate parser
 * for a path expression
 */
export interface FileParserRegistry {

    /**
     * Find a parser for the given path expression.
     * It's first location step must start with a node name.
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
        const determiningStep = parsed.locationSteps.find(s => s.axis !== SelfAxisSpecifier);
        if (!!determiningStep && isNamedNodeTest(determiningStep.test)) {
            const parser = this.parserRegistry[determiningStep.test.name];
            if (!!parser) {
                return parser;
            }
        }
        return undefined;
    }

    public toString() {
        return `DefaultFileParserRegistry: parsers=[${Object.getOwnPropertyNames(this.parserRegistry)}]`;
    }
}
