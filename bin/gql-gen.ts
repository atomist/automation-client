#! /usr/bin/env node
/*
 * Copyright © 2018 Atomist, Inc.
 *
 * See LICENSE file.
 */

import * as child_process from "child_process";
import * as spawn from "cross-spawn";
import * as fs from "fs-extra";
import * as glob from "glob";
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

        const gqlGenCmd = path.join(cwd, "node_modules", ".bin", "gql-gen") +
            ((process.platform === "win32") ? ".cmd" : "");
        const gqlGenOutput = path.join(lib, "typings", "types.ts");
        const gqlGenArgs = [
            "--schema", schema,
            "--template", "graphql-codegen-typescript-template",
            "--out", gqlGenOutput,
            "--silent"
        ];

        const opts: child_process.SpawnOptions = {
            cwd,
            env: process.env,
            stdio: "inherit",
        };

        const graphQlGlob = `${lib}/graphql/!(ingester)/*.graphql`;

        const graphqlFiles = await util.promisify(glob)(graphQlGlob);
        if (graphqlFiles && graphqlFiles.length > 0) {
            gqlGenArgs.push(graphQlGlob);
        } else {
            console.info("No GraphQL files found in project, generating default types");
        }

        const cp = spawn(gqlGenCmd, gqlGenArgs, opts);
        cp.on("exit", (code, signal) => {
            if (code === 0) {
                process.exit(code);
            } else if (code) {
                console.error(`Generating GraphQL failed with non-zero status: ${code}`);
                process.exit(code);
            } else {
                console.error(`Generating GraphQL exited due to signal: ${signal}`);
                process.exit(128 + 2);
            }
        });
        cp.on("error", err => {
            console.error(`Generating GraphQL types errored: ${err.message}`);
            process.exit(2);
        });
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
