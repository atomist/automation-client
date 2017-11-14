import * as _ from "lodash";

import { defineDynamicProperties } from "@atomist/tree-path/manipulation/enrichment";
import { evaluateExpression } from "@atomist/tree-path/path/expressionEngine";
import { isSuccessResult, PathExpression, stringify } from "@atomist/tree-path/path/pathExpression";
import { parsePathExpression } from "@atomist/tree-path/path/pathExpressionParser";
import { TreeNode } from "@atomist/tree-path/TreeNode";
import { logger } from "../../internal/util/logger";
import { ProjectAsync } from "../../project/Project";
import { saveFromFilesAsync } from "../../project/util/projectUtils";
import { FileHit, MatchResult } from "./FileHits";
import { FileParser, isFileParser } from "./FileParser";
import { FileParserRegistry } from "./FileParserRegistry";

/**
 * Separates glob patterns from path expressions in unified expression syntax
 * @type {string}
 */
export const ExpressionSeparator = "::";

/**
 * Integrate path expressions with project operations to find all matches
 * using a unified string expression format of the form
 * <glob pattern>-><path expression>
 * This can be useful to foster reuse
 * @param p project
 * @param unifiedExpression file glob pattern + path expression to execute
 * @param parserOrRegistry parser for files
 * @return {Promise<TreeNode[]>} hit record for each matching file
 */
export function findByExpression(p: ProjectAsync,
                                 parserOrRegistry: FileParser | FileParserRegistry,
                                 unifiedExpression: string): Promise<MatchResult[]> {
    const split = unifiedExpression.split(ExpressionSeparator);
    if (split.length !== 2) {
        throw new Error(`Invalid unified expression syntax [${unifiedExpression}]: ` +
            `Format is <glob pattern>${ExpressionSeparator}<path expr>`);
    }
    const globPattern = split[0];
    const pathExpression = _.drop(split, 1).join("");
    logger.info("Glob is [%s], path expression [%s] from [%s]", globPattern, pathExpression, unifiedExpression);
    return findMatches(p, parserOrRegistry, globPattern, pathExpression);
}

/**
 * Integrate path expressions with project operations to find all matches
 * @param p project
 * @param globPattern file glob pattern
 * @param parserOrRegistry parser for files
 * @param pathExpression path expression string or parsed
 * @return {Promise<TreeNode[]>} hit record for each matching file
 */
export function findMatches(p: ProjectAsync,
                            parserOrRegistry: FileParser | FileParserRegistry,
                            globPattern: string,
                            pathExpression: string | PathExpression): Promise<MatchResult[]> {
    return findFileMatches(p, parserOrRegistry, globPattern, pathExpression)
        .then(fileHits => _.flatten(fileHits.map(f => f.matches)));
}

export function findFileMatches(p: ProjectAsync,
                                parserOrRegistry: FileParser | FileParserRegistry,
                                globPattern: string,
                                pathExpression: string | PathExpression): Promise<FileHit[]> {
    const parsed: PathExpression = toPathExpression(pathExpression);
    const parser = findParser(parsed, parserOrRegistry);
    if (!parser) {
        throw new Error(`Cannot find parser for path expression [${pathExpression}]: Using ${parserOrRegistry}`);
    }
    return saveFromFilesAsync<FileHit>(p, globPattern, file => {
        return parser.toAst(file)
            .then(topLevelProduction => {
                logger.debug("Successfully parsed file '%s' to AST with root node named '%s'. Will execute '%s'",
                    file.path, topLevelProduction.$name, stringify(parsed));
                defineDynamicProperties(topLevelProduction);
                const fileNode = {
                    path: file.path,
                    name: file.name,
                    $name: file.name,
                    $children: [topLevelProduction],
                };
                const r = evaluateExpression(fileNode, parsed);
                if (isSuccessResult(r)) {
                    logger.debug("%d matches in file '%s'", r.length, file.path);
                    return new FileHit(p, file, fileNode, r);
                } else {
                    logger.debug("No matches in file '%s'", file.path);
                    return undefined;
                }
            })
            .catch(err => {
                logger.info("Failed to parse file '%s': %s", file.path, err);
                return undefined;
            });
    });
}

/**
 * Convenient method to find all values of matching nodes--
 * typically, terminals such as identifiers
 * @param p project
 * @param globPattern file glob pattern
 * @param parserOrRegistry parser for files
 * @param pathExpression path expression string or parsed
 * @return {Promise<TreeNode[]>} hit record for each matching file
 */
export function findValues(p: ProjectAsync,
                           parserOrRegistry: FileParser | FileParserRegistry,
                           globPattern: string,
                           pathExpression: string | PathExpression): Promise<string[]> {
    return findFileMatches(p, parserOrRegistry, globPattern, pathExpression)
        .then(fileHits => _.flatten(fileHits.map(f => f.matches))
            .map(m => m.$value));
}

export function toPathExpression(pathExpression: string | PathExpression): PathExpression {
    return (typeof pathExpression === "string") ?
        parsePathExpression(pathExpression) :
        pathExpression;
}

export function findParser(pathExpression: PathExpression, fp: FileParser | FileParserRegistry): FileParser {
    if (isFileParser(fp)) {
        if (!!fp.validate) {
            fp.validate(pathExpression);
        }
        return fp;
    } else {
        return fp.parserFor(pathExpression);
    }
}
