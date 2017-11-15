#!/usr/bin/env node
import * as child_process from "child_process";
import * as process from "process";
console.warn("atomist-config is deprecated, use 'atomist config' instead");
process.argv.unshift("config");
child_process.execFileSync("atomist", process.argv, { env: process.env, stdio: "inherit" });
