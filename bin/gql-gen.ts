#! /usr/bin/env node
/*
 * Copyright © 2018 Atomist, Inc.
 *
 * See LICENSE file.
 */

import * as fs from "fs-extra";
import * as glob from "glob";
import { generate } from "graphql-code-generator";
import { Types } from "graphql-codegen-core";
import * as path from "path";
import * as util from "util";

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
 * Patch the handlebar template that renders the generated types out.
 * This patch puts back the original behaviour of creating only optional properties on generated types.
 *
 * @param cwd
 */
async function patchGraphQLCodeGenerator(cwd: string): Promise<void> {
    try {
        // patch up codegen template to create optional properties
        const codegenTemplate = path.join(cwd, "node_modules", "graphql-codegen-typescript-client", "dist", "index.js");
        if (await fs.pathExists(codegenTemplate)) {
            const contents = await fs.readFile(codegenTemplate, "utf8");
            await fs.writeFile(codegenTemplate, contents.replace(/{{ name }}: {{ convertedFieldType/, "{{ name }}?: {{ convertedFieldType"));
        }
    } catch (e) {
        console.error(`Failed to patch graphql-code-generator: ${e.message}`);
        process.exit(103);
    }
}

/**
 * Generate TypeScript typings for GraphQL schema entities.
 */
async function main(): Promise<void> {
    try {
        const cwd = process.cwd();
        const lib = await libDir(cwd);

        // check if the project has a custom schema
        const customSchemaLocation = path.join(lib, "graphql", "schema.json");
        const defaultSchemaLocation = path.join(cwd, "node_modules", "@atomist", "automation-client", "lib",
            "graph", "schema.json");
        const schema = (await fs.pathExists(customSchemaLocation)) ? customSchemaLocation : defaultSchemaLocation;

        const gqlGenOutput = path.join(lib, "typings", "types.ts");
        await fs.ensureDir(path.dirname(gqlGenOutput));

        const graphQlGlob = `${lib}/graphql/!(ingester)/*.graphql`;

        const config: Types.Config = {
            overwrite: true,
            watch: false,
            schema: [schema],
            generates: {
                [gqlGenOutput]: {
                    plugins: [
                        "typescript-common",
                        "typescript-client",
                    ],
                    config: {
                        namingConvention: {
                            enumValues: "keep",
                        },
                    },
                },
            },
        };

        const graphqlFiles = await util.promisify(glob)(graphQlGlob);

        if (graphqlFiles && graphqlFiles.length > 0) {
            await patchGraphQLCodeGenerator(cwd);
            config.documents = [graphQlGlob];
            await generate(config);
            const typesContent = await fs.readFile(gqlGenOutput, "utf8");
            await fs.writeFile(gqlGenOutput, `/* tslint:disable */\n\n${typesContent}`, "utf8");
        } else {
            console.info("No GraphQL files found in project, skipping type generation.");
        }
        process.exit(0);

    } catch (e) {
        console.error(`Generating GraphQL types failed: ${e.message}`);
        process.exit(1);
    }
    throw new Error("Should never get here, process.exit() called above");
}

main()
    .catch((err: Error) => {
        console.error(`Unhandled exception: ${err.message}`);
        process.exit(101);
    });
