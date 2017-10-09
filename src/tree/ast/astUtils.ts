import { File } from "../../project/File";

import * as _ from "lodash";

import { logger } from "../../internal/util/logger";

import { AllFiles } from "../../project/fileGlobs";
import { ProjectNonBlocking, ProjectScripting } from "../../project/Project";
import { saveFromFilesAsync } from "../../project/util/projectUtils";
import { defineDynamicProperties } from "../enrichment";
import { evaluateExpression } from "../path/expressionEngine";
import { isSuccessResult, PathExpression } from "../path/pathExpression";
import { parsePathExpression } from "../path/pathExpressionParser";
import { TreeNode } from "../TreeNode";
import { FileParser, isFileParser } from "./FileParser";
import { FileParserRegistry } from "./FileParserRegistry";

/**
 * Represents a file and the hits against it
 */
export class FileHit {

    constructor(private project: ProjectScripting, public file: File, public readonly matches: TreeNode[]) {
        interface Update {
            initialValue: string;
            currentValue: string;
            offset: number;
        }

        const updates: Update[] = [];

        function doReplace(): Promise<File> {
            return file.getContent().then(content => {
                // Replace in reverse order so that offsets work
                let newContent = content;
                for (const u of updates) {
                    logger.debug("Applying update " + JSON.stringify(u));
                    newContent = newContent.substr(0, u.offset) +
                        newContent.substr(u.offset).replace(u.initialValue, u.currentValue);
                }
                return file.setContent(newContent);
            });
        }

        // Define a "value" property on each match that causes the project to be updated
        matches.forEach(m => {
            const initialValue = m.$value;
            let currentValue = m.$value;
            Object.defineProperty(m, "$value", {
                get() {
                    return currentValue;
                },
                set(v2) {
                    logger.info("Updating value from [%s] to [%s] on [%s]", currentValue, v2, m.$name);
                    // TODO allow only one
                    currentValue = v2;
                    updates.push({initialValue, currentValue, offset: m.$offset});
                    updates.sort(u => -u.offset);
                },
            });
        });
        project.recordAction(p => doReplace());
    }
}

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
export function findByExpression(p: ProjectNonBlocking,
                                 parserOrRegistry: FileParser | FileParserRegistry,
                                 unifiedExpression: string): Promise<TreeNode[]> {
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
export function findMatches(p: ProjectNonBlocking,
                            parserOrRegistry: FileParser | FileParserRegistry,
                            globPattern: string,
                            pathExpression: string | PathExpression): Promise<TreeNode[]> {
    return findFileMatches(p, parserOrRegistry, globPattern, pathExpression)
        .then(fileHits => _.flatten(fileHits.map(f => f.matches)));
}

export function findFileMatches(p: ProjectNonBlocking,
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
                logger.debug("Successfully parsed file [%s] to AST with root node named [%s]. Will execute [%s]",
                    file.path, topLevelProduction.$name, pathExpression);
                defineDynamicProperties(topLevelProduction);
                // logger.debug(JSON.stringify(root, null, 1));
                const fileNode = {
                    path: file.path,
                    name: file.name,
                    $name: file.name,
                    $children: [topLevelProduction],
                };
                const r = evaluateExpression(fileNode, parsed);
                if (isSuccessResult(r)) {
                    logger.debug("%d matches in file [%s]", r.length, file.path);
                    return new FileHit(p, file, r);
                } else {
                    logger.debug("No matches in file [%s]", file.path);
                    return undefined;
                }
            })
            .catch(err => {
                logger.info("Failed to parse file [%s]: %s", file.path, err);
                return undefined;
            });
    });
}

export function toPathExpression(pathExpression: string | PathExpression): PathExpression {
    return (typeof pathExpression === "string") ?
        parsePathExpression(pathExpression) :
        pathExpression;
}

export function findParser(pathExpression: PathExpression, fp: FileParser | FileParserRegistry): FileParser {
    return (isFileParser(fp)) ?
        fp :
        fp.parserFor(pathExpression);
}
