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

/**
 * Figure out whether the lib directory is named lib or src.  lib is
 * preferred, meaning if it exists, it is returned and if neither it
 * nor src exists, it is returned.
 *
 * @param cwd directory to use as base for location of lib dir
 * @return Resolved, full path to lib directory
 */
function libDir(cwd: string): string {
    const lib = path.resolve(cwd, "lib");
    const src = path.resolve(cwd, "src");
    if (fs.existsSync(lib)) {
        return lib;
    } else if (fs.existsSync(src)) {
        return src;
    } else {
        return lib;
    }
}

/**
 * Generate TypeScript typings for GraphQL schema entities.
 */
async function main(): Promise<void> {
    try {
        const cwd = process.cwd();
        const lib = libDir(cwd);

        // check if the project has a custom schema
        const customSchemaLocation = path.join(lib, "graphql", "schema.json");
        const defaultSchemaLocation = path.join(cwd, "node_modules", "@atomist", "automation-client", "lib",
            "graph", "schema.json");
        const schema = fs.existsSync(customSchemaLocation) ? customSchemaLocation : defaultSchemaLocation;

        const gqlGenOutput = path.join(lib, "typings", "types.ts");
        await fs.ensureDir(path.dirname(gqlGenOutput));

        const graphQlGlob = `${lib}/graphql/!(ingester)/*.graphql`;

        const config: Types.Config = {
            overwrite: true,
            schema: [schema],
            generates: {
                [gqlGenOutput]: {
                    plugins: [
                        "typescript-common",
                    ],
                },
            },
        };

        const graphqlFiles = await util.promisify(glob)(graphQlGlob);

        if (graphqlFiles && graphqlFiles.length > 0) {
            config.documents = [graphQlGlob];
            await generate(config);
        } else {
            console.info("No GraphQL files found in project. Skipping type generation...");
        }

    } catch (e) {
        console.error(`Generating GraphQL types failed: ${e.message}`);
        process.exit(1);
    }
}

main()
    .catch((err: Error) => {
        console.error(`Unhandled exception: ${err.message}`);
        process.exit(101);
    });
