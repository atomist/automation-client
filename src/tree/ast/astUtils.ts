import { defineDynamicProperties } from "@atomist/tree-path/manipulation/enrichment";
import { evaluateExpression } from "@atomist/tree-path/path/expressionEngine";
import {
    isSuccessResult,
    PathExpression,
    stringify,
} from "@atomist/tree-path/path/pathExpression";
import { toPathExpression } from "@atomist/tree-path/path/utils";
import { TreeNode } from "@atomist/tree-path/TreeNode";
import * as _ from "lodash";
import { logger } from "../../internal/util/logger";

import { File } from "../../project/File";
import { ProjectAsync } from "../../project/Project";
import {
    gatherFromFiles,
    GlobOptions,
} from "../../project/util/projectUtils";
import { toSourceLocation } from "../../project/util/sourceLocationUtils";
import { LocatedTreeNode } from "../LocatedTreeNode";
import {
    FileHit,
    MatchResult,
    NodeReplacementOptions,
} from "./FileHits";
import {
    FileParser,
    isFileParser,
} from "./FileParser";
import { FileParserRegistry } from "./FileParserRegistry";

/**
 * Integrate path expressions with project operations to find all matches
 * @param p project
 * @param parserOrRegistry parser or parsers to use to parse files
 * @param globPatterns file glob patterns
 * @param pathExpression path expression string or parsed
 * @param functionRegistry registry to look for path expression functions in
 * @return {Promise<MatchResult[]>} matches
 */
export function findMatches(p: ProjectAsync,
                            parserOrRegistry: FileParser | FileParserRegistry,
                            globPatterns: GlobOptions,
                            pathExpression: string | PathExpression,
                            functionRegistry?: object): Promise<MatchResult[]> {
    return findFileMatches(p, parserOrRegistry, globPatterns, pathExpression, functionRegistry)
        .then(fileHits => _.flatten(fileHits.map(f => f.matches)));
}

/**
 * Integrate path expressions with project operations to gather mapped values from all matches.
 * Choose the files with globPatterns; choose the portions of code to match with the pathExpression.
 * Choose what to return based on each match with the mapper function.
 * Returns all of the values returned by the mapper (except undefined).
 * @param p project
 * @param parserOrRegistry parser or parsers to use to parse files
 * @param globPatterns file glob patterns
 * @param mapper mapping function from match result to result
 * @param pathExpression path expression string or parsed
 * @param functionRegistry registry to look for path expression functions in
 * @return {Promise<MatchResult[]>} matches
 */
export function gatherFromMatches<T>(p: ProjectAsync,
                                     parserOrRegistry: FileParser | FileParserRegistry,
                                     globPatterns: GlobOptions,
                                     pathExpression: string | PathExpression,
                                     mapper: (m: MatchResult) => T,
                                     functionRegistry?: object): Promise<T[]> {
    return findFileMatches(p, parserOrRegistry, globPatterns, pathExpression, functionRegistry)
        .then(fileHits => _.flatten(
            fileHits.map(f => f.matches.map(mapper).filter(x => !!x))));
}

/**
 * Integrate path expressions with project operations to find all matches
 * and their files
 * @param p project
 * @param parserOrRegistry parser or parsers to use to parse files
 * @param globPatterns file glob patterns
 * @param pathExpression path expression string or parsed
 * @param functionRegistry registry to look for path expression functions in
 * @return hits for each file
 */
export async function findFileMatches(p: ProjectAsync,
                                      parserOrRegistry: FileParser | FileParserRegistry,
                                      globPatterns: GlobOptions,
                                      pathExpression: string | PathExpression,
                                      functionRegistry?: object): Promise<FileHit[]> {
    const parsed: PathExpression = toPathExpression(pathExpression);
    const parser = findParser(parsed, parserOrRegistry);
    if (!parser) {
        throw new Error(`Cannot find parser for path expression [${pathExpression}]: Using ${parserOrRegistry}`);
    }
    const files = await gatherFromFiles(p, globPatterns, file => parseFile(parser, parsed, functionRegistry, p, file));
    const all = await Promise.all(files);
    return all.filter(x => !!x);
}

async function parseFile(parser: FileParser,
                         pex: PathExpression,
                         functionRegistry: object,
                         p: ProjectAsync,
                         file: File): Promise<FileHit> {
    return parser.toAst(file)
        .then(topLevelProduction => {
            logger.debug("Successfully parsed file '%s' to AST with root node named '%s'. Will execute '%s'",
                file.path, topLevelProduction.$name, stringify(pex));
            defineDynamicProperties(topLevelProduction);
            const fileNode = {
                path: file.path,
                name: file.name,
                $name: file.name,
                $children: [topLevelProduction],
            };
            const r = evaluateExpression(fileNode, pex, functionRegistry);
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
 * @param globPatterns file glob pattern
 * @param parserOrRegistry parser for files
 * @param pathExpression path expression string or parsed
 * @param functionRegistry registry to look for path expression functions in
 * @return {Promise<TreeNode[]>} hit record for each matching file
 */
export function findValues(p: ProjectAsync,
                           parserOrRegistry: FileParser | FileParserRegistry,
                           globPatterns: GlobOptions,
                           pathExpression: string | PathExpression,
                           functionRegistry?: object): Promise<string[]> {
    return findFileMatches(p, parserOrRegistry, globPatterns, pathExpression, functionRegistry)
        .then(fileHits => _.flatten(fileHits.map(f => f.matches))
            .map(m => m.$value));
}

/**
 * Integrate path expressions with project operations to find all matches
 * of a path expression and zap them. Use with care!
 * @param p project
 * @param globPatterns file glob pattern
 * @param parserOrRegistry parser for files
 * @param pathExpression path expression string or parsed
 * @param opts options for handling whitespace
 * @return {Promise<TreeNode[]>} hit record for each matching file
 */
export function zapAllMatches<P extends ProjectAsync = ProjectAsync>(p: P,
                                                                     parserOrRegistry: FileParser | FileParserRegistry,
                                                                     globPatterns: GlobOptions,
                                                                     pathExpression: string | PathExpression,
                                                                     opts: NodeReplacementOptions = {}): Promise<P> {
    return doWithAllMatches(p, parserOrRegistry, globPatterns, pathExpression,
        m => m.zap(opts));
}

/**
 * Integrate path expressions with project operations to find all matches
 * of a path expression and perform a mutation on them them. Use with care!
 * @param p project
 * @param globPatterns file glob pattern
 * @param parserOrRegistry parser for files
 * @param pathExpression path expression string or parsed
 * @param action what to do with matches
 * @return {Promise<TreeNode[]>} hit record for each matching file
 */
export function doWithAllMatches<P extends ProjectAsync = ProjectAsync>(p: P,
                                                                        parserOrRegistry: FileParser | FileParserRegistry,
                                                                        globPatterns: GlobOptions,
                                                                        pathExpression: string | PathExpression,
                                                                        action: (m: MatchResult) => void): Promise<P> {
    return findFileMatches(p, parserOrRegistry, globPatterns, pathExpression)
        .then(fileHits => {
            fileHits.forEach(fh => {
                const sorted = fh.matches.sort((m1, m2) => m1.$offset - m2.$offset);
                sorted.forEach(m => {
                    action(m);
                });
            });
            return (p as any).flush();
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
