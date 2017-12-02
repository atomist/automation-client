import * as _ from "lodash";

import { defineDynamicProperties } from "@atomist/tree-path/manipulation/enrichment";
import { evaluateExpression } from "@atomist/tree-path/path/expressionEngine";
import { isSuccessResult, PathExpression, stringify } from "@atomist/tree-path/path/pathExpression";
import { toPathExpression } from "@atomist/tree-path/path/utils";
import { TreeNode } from "@atomist/tree-path/TreeNode";
import { logger } from "../../internal/util/logger";
import { ProjectAsync } from "../../project/Project";
import { saveFromFilesAsync } from "../../project/util/projectUtils";
import { LocatedTreeNode } from "../LocatedTreeNode";
import { FileHit, MatchResult, NodeReplacementOptions } from "./FileHits";
import { FileParser, isFileParser } from "./FileParser";
import { FileParserRegistry } from "./FileParserRegistry";

import { File } from "../../project/File";
import { toSourceLocation } from "../../project/util/sourceLocationUtils";

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
    logger.debug("Glob is [%s], path expression [%s] from [%s]", globPattern, pathExpression, unifiedExpression);
    return findMatches(p, parserOrRegistry, globPattern, pathExpression);
}

/**
 * Integrate path expressions with project operations to find all matches
 * @param p project
 * @param globPattern file glob pattern
 * @param parserOrRegistry parser for files
 * @param pathExpression path expression string or parsed
 * @param functionRegistry registry to look for path expression functions in
 * @return {Promise<MatchResult[]>} hit records for each matching file
 */
export function findMatches(p: ProjectAsync,
                            parserOrRegistry: FileParser | FileParserRegistry,
                            globPattern: string,
                            pathExpression: string | PathExpression,
                            functionRegistry?: object): Promise<MatchResult[]> {
    return findFileMatches(p, parserOrRegistry, globPattern, pathExpression, functionRegistry)
        .then(fileHits => _.flatten(fileHits.map(f => f.matches)));
}

export function findFileMatches(p: ProjectAsync,
                                parserOrRegistry: FileParser | FileParserRegistry,
                                globPattern: string,
                                pathExpression: string | PathExpression,
                                functionRegistry?: object): Promise<FileHit[]> {
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
                const r = evaluateExpression(fileNode, parsed, functionRegistry);
                if (isSuccessResult(r)) {
                    logger.debug("%d matches in file '%s'", r.length, file.path);
                    return fillInSourceLocations(file, r)
                        .then(locatedNodes => new FileHit(p, file, fileNode, locatedNodes));
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
 * Use file content to fill in LocatedTreeNode.sourceLocation
 * @param {File} f
 * @param {TreeNode[]} nodes
 * @return {Promise<LocatedTreeNode[]>}
 */
function fillInSourceLocations(f: File, nodes: TreeNode[]): Promise<LocatedTreeNode[]> {
    if (nodes.length === 0) {
        // Optimization.
        // In this case, let's not read the file content and leave source locations undefined
        return Promise.resolve(nodes as LocatedTreeNode[]);
    }
    return f.getContent()
        .then(content => {
            nodes.forEach(n => {
                (n as LocatedTreeNode).sourceLocation = toSourceLocation(f, content, n.$offset);
            });
            return nodes as LocatedTreeNode[];
        });
}

/**
 * Convenient method to find all values of matching nodes--
 * typically, terminals such as identifiers
 * @param p project
 * @param globPattern file glob pattern
 * @param parserOrRegistry parser for files
 * @param pathExpression path expression string or parsed
 * @param functionRegistry registry to look for path expression functions in
 * @return {Promise<TreeNode[]>} hit record for each matching file
 */
export function findValues(p: ProjectAsync,
                           parserOrRegistry: FileParser | FileParserRegistry,
                           globPattern: string,
                           pathExpression: string | PathExpression,
                           functionRegistry?: object): Promise<string[]> {
    return findFileMatches(p, parserOrRegistry, globPattern, pathExpression, functionRegistry)
        .then(fileHits => _.flatten(fileHits.map(f => f.matches))
            .map(m => m.$value));
}

/**
 * Integrate path expressions with project operations to find all matches
 * of a path expression and zap them. Use with care!
 * @param p project
 * @param globPattern file glob pattern
 * @param parserOrRegistry parser for files
 * @param pathExpression path expression string or parsed
 * @param opts options for handling whitespace
 * @return {Promise<TreeNode[]>} hit record for each matching file
 */
export function zapAllMatches<P extends ProjectAsync = ProjectAsync>(p: P,
                                                                     parserOrRegistry: FileParser | FileParserRegistry,
                                                                     globPattern: string,
                                                                     pathExpression: string | PathExpression,
                                                                     opts: NodeReplacementOptions = {}): Promise<P> {
    return findFileMatches(p, parserOrRegistry, globPattern, pathExpression)
        .then(fileHits => {
            fileHits.forEach(fh => {
                const sorted = fh.matches.sort((m1, m2) => m1.$offset - m2.$offset);
                sorted.forEach(m => {
                    m.zap(opts);
                });
            });
            return p.flush();
        });
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
