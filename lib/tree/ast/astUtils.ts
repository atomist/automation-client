import {
    defineDynamicProperties,
    evaluateExpression,
    FunctionRegistry,
    isSuccessResult,
    isUnionPathExpression,
    PathExpression,
    stringify,
    toPathExpression,
    TreeNode,
} from "@atomist/tree-path";
import * as _ from "lodash";
import { logger } from "../../util/logger";

import { Predicate } from "@atomist/tree-path/lib/path/pathExpression";
import {
    AttributeEqualityPredicate,
    NestedPathExpressionPredicate,
} from "@atomist/tree-path/lib/path/predicates";
import { File } from "../../project/File";
import {
    Project,
    ProjectAsync,
} from "../../project/Project";
import {
    fileIterator,
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
 * Create a MatchTester to use against this file, caching
 * any parsed or otherwise computed resources.
 */
export type MatchTesterMaker = (f: File) => Promise<MatchTester>;

/**
 * Options for performing a path expression query against a project
 */
export interface PathExpressionQueryOptions {

    /**
     * Parser or parsers to use to parse files
     */
    parseWith: FileParser | FileParserRegistry;

    /**
     * Glob pattern or patterns describing files to match
     */
    globPatterns: GlobOptions;

    /**
     * Path expression to execute
     */
    pathExpression: string | PathExpression;

    /** functionRegistry registry to look for path expression functions in */
    functionRegistry?: FunctionRegistry;

    /**
     * Optional filter to exclude files before parse phase. This can increase efficiency
     * by preventing unnecessary parsing.
     */
    fileFilter?: (f: File) => Promise<boolean>;

    /**
     * Optionally return a tester for matches in this file, testing the node backing the match.
     * This can be useful for contextual testing: E.g. testing if one match is within another.
     * @param {File} f
     * @return {Promise<MatchTester>}
     */
    testWith?: MatchTesterMaker;
}

/**
 * Tests matches within this file, using their tree node basis.
 */
export type MatchTester = (n: LocatedTreeNode) => boolean;

/**
 * Integrate path expressions with project operations to find all matches
 * @param p project
 * @param parserOrRegistry parser or parsers to use to parse files
 * @param globPatterns file glob patterns
 * @param pathExpression path expression string or parsed
 * @param functionRegistry registry to look for path expression functions in
 * @return {Promise<MatchResult[]>} matches
 * @type T match type to mix in
 */
export function findMatches<T>(p: ProjectAsync,
                               parserOrRegistry: FileParser | FileParserRegistry,
                               globPatterns: GlobOptions,
                               pathExpression: string | PathExpression,
                               functionRegistry?: FunctionRegistry): Promise<Array<MatchResult & T>> {
    return findFileMatches(p, parserOrRegistry, globPatterns, pathExpression, functionRegistry)
        .then(fileHits => _.flatten(fileHits.map(f => f.matches as any)));
}

/**
 * Generator style iteration over matches in a project.
 * Modifications made to matches will be made on the project.
 * @param p project
 * @param opts options for query
 * @type T match type to mix in
 */
export async function* matchIterator<T>(p: Project,
                                        opts: PathExpressionQueryOptions): AsyncIterable<MatchResult & T> {
    const fileHits = fileHitIterator(p, opts);
    for await (const fileHit of fileHits) {
        try {
            for (const match of fileHit.matches) {
                yield match as any;
            }
        } finally {
            // Even if the user jumps out of the generator, ensure that we make the changes to the present file
            (p as any).flush();
        }
    }
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
                                     functionRegistry?: FunctionRegistry): Promise<T[]> {
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
                                      functionRegistry?: FunctionRegistry): Promise<FileHit[]> {
    const parsed: PathExpression = toPathExpression(pathExpression);
    const parser = findParser(parsed, parserOrRegistry);
    if (!parser) {
        throw new Error(`Cannot find parser for path expression [${pathExpression}]: Using ${parserOrRegistry}`);
    }
    const valuesToCheckFor = literalValues(parsed);
    const files = await gatherFromFiles(p, globPatterns, file => parseFile(parser, parsed,
        functionRegistry, p, file, valuesToCheckFor, undefined));
    const all = await Promise.all(files);
    return all.filter(x => !!x);
}

/**
 * Generator style iteration over file matches
 * @param p project
 * @param opts options for query
 */
export async function* fileHitIterator(p: Project,
                                       opts: PathExpressionQueryOptions): AsyncIterable<FileHit> {
    const parsed: PathExpression = toPathExpression(opts.pathExpression);
    const parser = findParser(parsed, opts.parseWith);
    if (!parser) {
        throw new Error(`Cannot find parser for path expression [${opts.pathExpression}]: Using ${opts.parseWith}`);
    }
    const valuesToCheckFor = literalValues(parsed);
    for await (const file of await fileIterator(p, opts.globPatterns, opts.fileFilter)) {
        const fileHit = await parseFile(parser, parsed, opts.functionRegistry, p, file, valuesToCheckFor, opts.testWith);
        if (!!fileHit) {
            yield fileHit;
        }
    }
}

async function parseFile(parser: FileParser,
                         pex: PathExpression,
                         functionRegistry: FunctionRegistry,
                         p: ProjectAsync,
                         file: File,
                         valuesToCheckFor: string[],
                         matchTester: MatchTesterMaker): Promise<FileHit> {
    // First, apply optimizations
    if (valuesToCheckFor.length > 0) {
        const content = await file.getContent();
        if (valuesToCheckFor.some(literal => !content.includes(literal))) {
            return undefined;
        }
    }
    if (!!parser.couldBeMatchesInThisFile && !await parser.couldBeMatchesInThisFile(pex, file)) {
        // Skip parsing as we know there can never be matches
        return undefined;
    }

    // If we get here, we need to parse the file
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
                    .then(locatedNodes => {
                        if (matchTester) {
                            return matchTester(file)
                                .then(test => new FileHit(p, file, fileNode,
                                    locatedNodes.filter(test)));
                        }
                        return new FileHit(p, file, fileNode, locatedNodes);
                    });
            } else {
                logger.debug("No matches in file '%s'", file.path);
                return undefined;
            }
        }).catch(err => {
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
                           functionRegistry?: FunctionRegistry): Promise<string[]> {
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
export async function doWithAllMatches<P extends ProjectAsync = ProjectAsync>(p: P,
                                                                              parserOrRegistry: FileParser | FileParserRegistry,
                                                                              globPatterns: GlobOptions,
                                                                              pathExpression: string | PathExpression,
                                                                              action: (m: MatchResult) => void): Promise<P> {
    const fileHits = await findFileMatches(p, parserOrRegistry, globPatterns, pathExpression);
    fileHits.forEach(fh => applyActionToMatches(fh, action));
    return (p as any).flush();
}

function applyActionToMatches(fh: FileHit, action: (m: MatchResult) => void) {
    // Sort file hits in reverse order so that offsets aren't upset by applications
    const sorted = fh.matches.sort((m1, m2) => m1.$offset - m2.$offset);
    sorted.forEach(action);
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

/**
 * Return literal values that must be present in a file for this path expression to
 * match. Return the empty array if there are no literal @values or if we cannot
 * determine whether there may be for this path expression.
 * @param {PathExpression} pex
 * @return {string[]}
 */
export function literalValues(pex: PathExpression): string[] {
    return allPredicates(pex)
        .filter(isAttributeEqualityPredicate)
        .map(p => p.value);
}

function allPredicates(pe: PathExpression): Predicate[] {
    if (isUnionPathExpression(pe)) {
        // We do not attempt to handle union path expressions for now.
        // If you want efficiency, don't write one
        return [];
    }
    return _.flatten(pe.locationSteps.map(s => {
        return _.flatten(s.predicates.map(p => {
            if (isNestedPredicate(p)) {
                return allPredicates(p.pathExpression);
            } else {
                return [p];
            }
        }));
    }));
}

function isAttributeEqualityPredicate(p: Predicate): p is AttributeEqualityPredicate {
    const maybe = p as AttributeEqualityPredicate;
    return !!maybe.value;
}

function isNestedPredicate(p: Predicate): p is NestedPathExpressionPredicate {
    const maybe = p as NestedPathExpressionPredicate;
    return !!maybe.pathExpression;
}
