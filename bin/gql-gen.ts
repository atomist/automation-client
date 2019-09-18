#! /usr/bin/env node
/*
 * Copyright © 2018 Atomist, Inc.
 *
 * See LICENSE file.
 */

import { codegen } from "@graphql-codegen/core";
import { Types } from "@graphql-codegen/plugin-helpers";
import * as typescriptPlugin from "@graphql-codegen/typescript";
import * as typescriptCompatibilityPlugin from "@graphql-codegen/typescript-compatibility";
import * as typescriptOperationsPlugin from "@graphql-codegen/typescript-operations";
import * as fs from "fs-extra";
import * as glob from "glob";
import {
    parse,
    printSchema,
} from "graphql";
import { loadSchema } from "graphql-toolkit";
import { RenameTypes } from "graphql-tools";
import * as path from "path";
import * as util from "util";
import yargs from "yargs";

/* tslint:disable:no-console */

/**
 * Figure out whether the lib directory is named lib or src.  lib is
 * preferred, meaning if it exists, it is returned and if neither it
 * nor src exists, it is returned.
 *
 * @param cwd directory to use as base for location of lib dir
 * @return Resolved, full path to lib directory
 */
async function libDir(cwd: string): Promise<string> {
    const lib = path.resolve(cwd, "lib");
    const src = path.resolve(cwd, "src");
    if (await fs.pathExists(lib)) {
        return lib;
    } else if (await fs.pathExists(src)) {
        return src;
    } else {
        return lib;
    }
}

/**
 * Generate TypeScript typings for GraphQL schema entities.
 */
async function main(): Promise<void> {

    const specified = yargs({ output: "", input: "" }, "").argv;

    try {
        const cwd = process.cwd();
        const lib = await libDir(cwd);
        const inputDir = specified.input || path.join(lib, "graphql");

        // check if the project has a custom schema
        const customSchemaLocation = path.join(inputDir, "schema.json");
        const defaultSchemaLocation = path.join(cwd, "node_modules", "@atomist", "automation-client", "lib",
            "graph", "schema.json");
        const schema = (await fs.pathExists(customSchemaLocation)) ? customSchemaLocation : defaultSchemaLocation;
        const transform = new RenameTypes(name => {
            switch (name) {
                case "Fingerprint":
                case "PushImpact":
                    return `Deprecated${name}`;
                default:
                    return undefined;
            }
        });

        const gqlGenOutput = specified.output || path.join(lib, "typings", "types.ts");
        await fs.ensureDir(path.dirname(gqlGenOutput));

        const graphQlGlob = path.join(inputDir, "!(ingester)", "*.graphql");

        const config: Types.GenerateOptions = {
            schema: parse(printSchema(transform.transformSchema(await loadSchema(schema)))),
            filename: gqlGenOutput,
            plugins: [{
                typescript: {
                    namingConvention: {
                        enumValues: "keep",
                    },
                },
            }, {
                typescriptOperations: {
                },
            }, {
                typescriptCompatibility: {
                    preResolveTypes: true,
                },
            }],
            pluginMap: {
                typescript: typescriptPlugin,
                typescriptOperations: typescriptOperationsPlugin,
                typescriptCompatibility: typescriptCompatibilityPlugin,
            },
            documents: [],
            config: {},
        };

        const graphqlFiles = await util.promisify(glob)(graphQlGlob);
        const documents: Types.DocumentFile[] = [];

        if (graphqlFiles && graphqlFiles.length > 0) {
            for (const graphqlFile of graphqlFiles) {
                const content = (await fs.readFile(graphqlFile)).toString();
                const document = parse(content);
                documents.push({
                    content: document,
                    filePath: graphqlFile,
                });
            }
            config.documents = documents;

            // Make all properties optional to retain backwards compatibility
            const typesContent = (await codegen(config)).replace(/ ([a-zA-Z_\-0-9]+): Maybe/g, ` $1?: Maybe`);

            // Write the new types.ts content back out
            await fs.writeFile(gqlGenOutput, `/* tslint:disable */\n\n${typesContent}`, "utf8");
        } else {
            console.info("No GraphQL files found in project, skipping type generation.");
        }
        process.exit(0);

    } catch (e) {
        console.error(`Generating GraphQL types failed: ${e.message || e}`);
        process.exit(1);
    }
    throw new Error("Should never get here, process.exit() called above");
}

main()
    .catch((err: Error) => {
        console.error(`Unhandled exception: ${err.message || err}`);
        process.exit(101);
    });
